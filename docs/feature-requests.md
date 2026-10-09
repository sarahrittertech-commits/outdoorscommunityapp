---
sidebar_position: 2.7
title: Feature requests
---

# Feature requests

Every product request, where it came from and what happened to it. This
log belongs to **the tool**: a feature built here is part of every board
made from this code, so Sage Women and later boards inherit it with the next
merge from upstream ([Cloning](./cloning)).

**Scope** says where a request lands:

- **Tool**: shared product behavior. Built once, every board gets it. If
  one board needs it off or different, it becomes a setting in that board's
  `src/config/site.ts`, never a fork in the code.
- **Brand**: one board's look (colors, logo, drawings, sample photos), in
  `src/brand/`.
- **Board**: one board's content or operations (its listings, its research
  areas, its data fixes).

**Status:** *Live*, *Built* (merged, waiting on a production step), *In
review* (a PR is open), *Draft* (use case written, awaiting Sarah's go),
*Decision needed*, *Not planned*.

Requests from the 8 October Magic Patterns design are summarized in the
[feature map](./feature-map); the rows below are the requests since.

| Date | Requested by | Request | Scope | Use case / requirements | Status and notes |
| --- | --- | --- | --- | --- | --- |
| 8 Oct | Sarah | Branded sign-in email instead of Supabase's | Tool (wording per board in templates) | UC-25, FR-AC-11 to FR-AC-13 | Draft. Needs a domain and Resend. |
| 8 Oct | Sarah | Email check when someone claims a group | Tool | UC-26, FR-GR-18 to FR-GR-20 | Draft. Needs a domain. |
| 8 Oct | Sarah | Approval for new groups | Tool (policy as a setting) | UC-27, FR-GR-8, FR-GR-21, FR-GR-22 | Decision needed: every group, first group only (recommended), or none. |
| 9 Oct | Sarah | Bring the 8 October design's home page to the live site: line-drawn ridgeline hero, town and distance search, Near you, Explore destinations map | Tool (layout and search), Brand (drawing, colors), Board (towns list) | UC-14, UC-15, FR-BR-12 to FR-BR-18, ADR-0007 | Live. Towns not zip codes; destinations are towns until places exist. |
| 9 Oct | Sarah | A demo login like the prototype's | Tool (on/off per board) | UC-28, FR-AC-14 to FR-AC-16 | Decision needed: read-only demo member (recommended), separate demo board, or none. |
| 9 Oct | Sarah | Research run for more cities, venues, guides, bike shops and trail hubs | Board | UC-9 (agent instructions) | Blocked: the cloud routine needs an allow rule for the intake call, set by Sarah on claude.ai. |
| 9 Oct | Sarah | Mark likely duplicates from research for review; drop exact matches silently | Tool | FR-RS-3, FR-RS-10 | Built (PR #21). Migration to apply. |
| 9 Oct | Code review | Research events reaching live listings without review | Tool | FR-RS-8 | Built (PR #21): only from the listing's own website. |
| 9 Oct | Sarah | Sign up with an email invite and a password, not an emailed link | Tool | UC-29, FR-AC-17 to FR-AC-21, ADR-0009 | In review (PR #27). Open sign-up with email confirmation; password only. Needs a domain for the emails. |
| 9 Oct | Sarah | Only her account is site admin | Board | — | Live. Admin can only be granted in the database. |
| 9 Oct | Sarah | Link to the group's own website | Tool | FR-GR-23 | Built (PR #23). Migration to apply. |
| 9 Oct | Sarah | More vertical space: 25px under breadcrumbs, at least 15px between items | Tool | docs/brand.md *Spacing* | Built (PR #23). |
| 9 Oct | Sarah | Photos from the design on a couple of sample groups and their events | Brand | docs/brand.md *Representative photos* | Built (PR #23). Captioned as representative, never as the group's own. |
| 9 Oct | Sarah | Real group photos and a photos page per group | Tool | UC-21, UC-24, FR-GR-12 to FR-GR-14 | Draft. |
| 9 Oct | Sarah | Event form: description and details, a photo, Free or Paid with registration fee and total cost, optional RSVPs with a waitlist, or a sign-up link | Tool | UC-30, FR-EV-23 to FR-EV-28 | In review (PR #24). |
| 9 Oct | Sarah | One page admin and up to two page managers; only the page admin transfers ownership | Tool (limit as a setting) | UC-31, FR-MB-11, FR-MB-12 | Built (PR #28). Limit of two in the database; manager email invites wait on email. Migration to apply. |
| 9 Oct | Sarah | Invite members by email, one address or many | Tool | UC-31, FR-MB-13, FR-MB-14, FR-MB-16 | Built (PR #28) but switched off until email is set up (needs a domain). |
| 9 Oct | Sarah | Generate a link to send to people to join the group | Tool | UC-31, FR-MB-14 to FR-MB-16 | Built (PR #28). |
| 9 Oct | Sarah | Invite page that names the group and creates the account and joins in one place | Tool | UC-31, FR-MB-14 | Built (PR #28, after #27). |
| 9 Oct | Sarah | Fix Catalyst Sports Asheville's activity (filed under mountain biking) | Board | — | Open: a data fix for the site admin. |
| 9 Oct | Sarah | Suggestions to the site admin: recommend a region, suggest a feature, a group to invite or an event to add | Tool | UC-32, FR-AD-4 to FR-AD-7 | Draft (PR #26). Members only, private to the site admin, statuses Planned / Done / Declined. |
| 8 Oct | Magic Patterns design | Save an event for later | Tool | UC-22, FR-EV-18 | Built (approved 9 Oct). Migration to apply. |
| 8 Oct | Magic Patterns design | Member list privacy per group | Tool | UC-16, FR-MB-10 | Built (approved 9 Oct). Migration to apply. |

## How a request becomes a feature

1. It is logged here with its scope.
2. A **tool** request gets a use case and user flow in this repository
   ([Use cases](./use-cases), [User flows](./user-flows)), user stories in
   [User stories](./user-stories), and draft requirements. Sarah reviews and
   says go (CLAUDE.md).
3. It is built here, once, behind a setting in `src/config/site.ts` if any
   board may want it off or different.
4. Each other board gets it with its next merge from upstream, and decides
   its settings.
