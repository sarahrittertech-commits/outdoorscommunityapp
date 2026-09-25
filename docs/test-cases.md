---
sidebar_position: 9
title: Test cases
---

# Test cases

A solo build has no code review, so the tests are the safety net. They are
weighted toward the thing most likely to go wrong silently in this project:
**someone seeing or changing something they shouldn't.**

:::note Status — 25 September 2026
PT-1 to PT-21 are implemented in `supabase/tests/` (125 assertions) and pass.
UT-1 to UT-5 are implemented in `src/lib/*.test.ts` (24 tests) and pass.
E2E-1 to E2E-3 were walked in a real browser against a local database (43
checks, all passing) but are not yet a CI job.
:::

## Automated — permissions (database)

Run by `supabase test db` (pgTAP) in CI on every push, against a local
Supabase with fixture users in every role. Each test signs in as a role and
checks the database's answer directly, bypassing the web app, because the
web app is not the thing enforcing the rule.

| ID | Check | Fails when |
| --- | --- | --- |
| PT-1 | Every table in the exposed schemas has RLS enabled | A new table is added without RLS |
| PT-2 | No policy grants insert, update or delete to the anonymous role | Someone takes the dashboard's shortcut |
| PT-3 | A visitor can read active groups, events and categories, and nothing in threads, replies, members or reports | A read policy is too broad |
| PT-4 | A signed-in non-member cannot read a group's threads, replies or member list | Discussion privacy leaks |
| PT-5 | A pending member has no member access until approved | Approval is only enforced in the UI |
| PT-6 | A members-only event address is unreadable to visitors and non-members, readable to members | The address leaks through the API |
| PT-7 | A member cannot create, edit or cancel an event | Event permissions too loose |
| PT-8 | A member cannot post in a group they don't belong to | Group scoping missing from a policy |
| PT-9 | Nobody, including the owner, can post while discussions are off | FR-GR-4 enforced only in the UI |
| PT-10 | Nobody can reply to a locked thread | Lock enforced only in the UI |
| PT-11 | A member can edit only their own posts | Ownership check missing |
| PT-12 | An admin cannot promote, demote, remove the owner or remove another admin | Admin and owner powers blur |
| PT-13 | A second owner row for a group is refused | Exactly-one-owner constraint missing |
| PT-14 | A banned user cannot rejoin or request to join | Ban is only a delete |
| PT-15 | An RSVP after start time, on a cancelled event or beyond capacity is refused | RSVP rules only in the UI |
| PT-16 | A suspended user can read but every write is refused | Suspension incomplete |
| PT-17 | A user who hasn't accepted the terms cannot write anything | FR-AC-2 bypassable |
| PT-18 | A group admin sees only their own group's reports; the site admin sees all | Report routing leaks |
| PT-19 | Nobody can update or delete a moderation log row | Log isn't append-only |
| PT-20 | No table readable by other users contains an email address | FR-AC-5 broken |
| PT-21 | The rate limits in TR-SEC-8 refuse the request over the limit | Limits missing or wrong |

## Automated — unit

Run by the unit test command in CI. Pure functions only.

| ID | Unit | Assertion |
| --- | --- | --- |
| UT-1 | Plain-text renderer | `<script>` is shown as text; URLs become links with `rel="nofollow ugc noopener"`; line breaks are kept |
| UT-2 | Event time formatting | An event stored in UTC displays in its own time zone, including across a daylight-saving change |
| UT-3 | `.ics` generator | Output has the correct start, end, time zone, title and location |
| UT-4 | Slug generator | Two groups called "Trail Friends" get distinct slugs; slugs are lowercase and URL-safe |
| UT-5 | Zod schemas | Each form schema rejects missing required fields and over-length text |

## Automated — end to end

Playwright in CI against the local stack with seed data.

| ID | Journey | Passes when |
| --- | --- | --- |
| E2E-1 | UC-1, signed out | Home → subcategory → group → event in three clicks; no sign-in prompt |
| E2E-2 | UC-2 | Sign in (using the local email catcher), accept terms, join, RSVP, return to the event page showing "going" |
| E2E-3 | Browse with JavaScript off | Home, listing, group and event pages render fully |

## Manual — before launch

| ID | Check |
| --- | --- |
| MT-1 | Walk all six use cases on the production site with seed data |
| MT-2 | Sign-in email arrives in Gmail and Outlook inboxes, not spam |
| MT-3 | Lighthouse mobile: performance and accessibility at or above target (TR-PERF-3, TR-A11Y) |
| MT-4 | Keyboard-only pass through join, RSVP and post |
| MT-5 | Supabase security advisor reports no errors (TR-SEC-10) |
| MT-6 | Supabase project is on Pro and backups are listed (TR-OPS-2) |
| MT-7 | Shared group and event links show correct previews in iMessage and Slack |
