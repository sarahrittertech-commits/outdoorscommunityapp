---
sidebar_position: 9
title: ADR-0008 Brand separation
---

# ADR-0008 — Separating the tool from the brand

**Status:** Proposed · **Date:** 9 October 2026

## Context

This board is cloned: Sage Women runs the same product for a different
audience, as a fork that pulls fixes in with `git merge upstream/main`
([Cloning](../cloning)). That only works if a merge brings the tool's new
features without touching the clone's own look.

It stopped working. Merging the 8 October work into Sage Women conflicted
in six files, and every one of them was a brand file: the colors, the logo,
the favicon, the brand guide, and the two documents that say which product
this is. The product documents — use cases, flows, requirements, the data
model, the test cases — all merged cleanly.

The cause is visible in one file. The 8 October refresh changed
`globals.css` in two ways at once:

- it **added color slots** (`--band`, `--search`, `--subtle`) because the
  rebuilt Communities, Events and layout pages needed them; and
- it **set those slots** to this board's plum and orange.

The first is the tool and every board needs it. The second is the brand and
no other board wants it. Both lived in the same block, so Git could only
offer the whole thing as a conflict. Worse, the quiet failure: a clone that
resolves such a conflict by keeping its own colors then takes the new pages
without the slots they use, and those pages lose a color with nothing
failing anywhere.

## Decision

Three buckets, and a place for each.

| Bucket           | What it covers                                                                                            | Where it lives                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **The tool**     | Pages, components, server actions, schema, permissions, and the _set_ of color slots and what each is for | Anywhere outside `src/brand/`; merges into a clone untouched          |
| **The brand**    | Color _values_, logo, favicon, category drawings, brand guide                                             | `src/brand/`, plus `src/app/icon.svg` where Next.js requires it       |
| **The audience** | Name and wording, categories, legal copy, PRD, personas, CLAUDE.md, README                                | `src/config/site.ts`, the legal pages, the directory seed, those docs |

Three rules follow.

1. **Shared code names slots; it never holds a color.** `src/brand/tokens.css`
   holds the values. A board is re-skinned by replacing that one file.
   Shared rules use role slots (`--heading`, `--search-ink`, `--mark`), never
   a board's palette names (`--plum`), so a clone is never forced to keep a
   slot called plum.
2. **The contract is tested, not remembered.** `src/brand/tokens.test.ts`
   fails, naming the slot and the file that uses it, when shared code uses a
   slot the brand file does not define, or when it reaches for a palette
   name. A missing color becomes a failed check rather than a page that
   quietly looks wrong.
3. **A clone owns its brand and audience files outright.** `.gitattributes`
   marks them `merge=ours`, so an upstream merge keeps the clone's version
   instead of raising the same conflicts every time. A clone turns this on
   once with `git config merge.ours.driver true`.

Product documents are deliberately **not** marked: a clone should receive
new use cases, flows and requirements, and treat them as its catch-up list.
The PRD and personas are marked, because they describe who a board is for.

## Consequences

**What this costs.** One refactor that moves files and changes nothing
visible, and a rule to keep: a feature that needs a new color adds a slot
rather than a hex value. Each board must then give that slot a value, which
the test enforces. A clone also runs one `git config` line when it is set
up.

**What it buys.** An upstream merge touches no brand file, so catching up
stops being a design review. The clone stays current on the tool, which is
where the bugs and the security fixes are, while its look only changes when
someone decides to change it. And the failure mode that is hardest to spot —
a new section quietly rendering with no background on the clone — becomes a
named check failure before it ships.

**What it does not solve.** A redesign that changes _structure_ rather than
color, such as new markup in a shared page, still reaches every board. That
is correct — it is the tool — but it means a clone should look at the pages
after a large visual change. The `site.ts` settings exist for the cases
where a board genuinely needs to differ, and anything a clone needs beyond
colors should be built here, behind one of those settings, rather than only
in the clone.

## Alternatives considered

**Leave it as it is and resolve conflicts by hand.** Rejected: the cost
repeats on every merge, it grows as the boards diverge, and it fails
silently in the one case that matters most.

**Give the clone its own copy of the whole stylesheet.** Rejected: the
clone would then miss every shared rule added upstream, which is most of
what a refresh contains.

**Build the clone as a theme switch inside one deployment.** Rejected: the
boards are separate products with separate databases and separate
repositories ([Cloning](../cloning)). A runtime switch would put both
audiences in one codebase and one deployment, which is a larger change than
the problem warrants.
