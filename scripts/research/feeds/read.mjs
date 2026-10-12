#!/usr/bin/env node
// Feed reader (UC-39, FR-ES-3; 12 October 2026). Reads public calendar feeds
// listed in feeds.json, with no AI: today, North Carolina State Parks'
// Localist calendar. Timed, future events near a live region are sent to the
// research intake under that region's venue (listed once by the site admin),
// where the usual rules publish them. Free to run; meant for a weekly schedule.
//
//   RESEARCH_AGENT_TOKEN=… node scripts/research/feeds/read.mjs [--dry]

import { readFile } from "node:fs/promises";

import { batches, localistEvents } from "./lib.mjs";

const INTAKE = process.env.RESEARCH_INTAKE_URL ?? "https://rxszqxwpgbrdytbkyxwp.supabase.co/functions/v1/research-intake";
const UA = "BranchOutdoorsFeedReader/1.0 (+public community board; reads public calendars only)";
const dry = process.argv.includes("--dry");
const token = process.env.RESEARCH_AGENT_TOKEN;
if (!dry && !token) {
  console.log("RESEARCH_AGENT_TOKEN is not set; nothing to do.");
  process.exit(0);
}

const config = JSON.parse(await readFile(new URL("./feeds.json", import.meta.url), "utf8"));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const feed of config.feeds) {
  if (feed.kind !== "localist") continue;
  const all = new Map();
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const res = await fetch(`${feed.api}?days=${feed.days}&pp=100&page=${pageNo}`, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.log(`${feed.api} answered ${res.status} on page ${pageNo}; stopping this feed.`);
      break;
    }
    const page = await res.json();
    for (const [name, { host, events }] of localistEvents(page, feed)) {
      if (!all.has(name)) all.set(name, { host, events: [] });
      all.get(name).events.push(...events);
    }
    if (!page.page?.next_page) break;
    await wait(1500); // the calendar asks for a one-second crawl delay
  }
  for (const [name, { host, events }] of all) {
    console.log(`${name}: ${events.length} timed events`);
    for (const chunk of batches(events)) {
      const candidate = {
        kind: "venue",
        name,
        subcategory: "day-hikes",
        area: host.area,
        source_url: feed.calendar_url,
        verification: "verified",
        description: host.description,
        evidence: `Read from the public ${feed.department} calendar feed (${feed.api}) by the weekly feed reader.`,
        events: chunk,
      };
      if (dry) {
        console.log(`  would send ${chunk.length} events`);
        continue;
      }
      const res = await fetch(INTAKE, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", candidate }),
      });
      const json = await res.json().catch(() => ({}));
      console.log(`  ${json.result ?? `HTTP ${res.status}`}: ${chunk.length} events`);
    }
  }
}
