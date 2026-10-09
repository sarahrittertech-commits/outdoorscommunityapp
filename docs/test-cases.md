---
sidebar_position: 9
title: Test cases
---

# Test cases

A solo build has no code review, so the tests are the safety net. They are
weighted toward the thing most likely to go wrong silently in this project:
**someone seeing or changing something they shouldn't.**

:::note Status — 8 October 2026
PT-1 to PT-27 are implemented in `supabase/tests/` (186 assertions) and pass.
UT-1 to UT-5 are implemented in `src/lib/*.test.ts` (26 tests) and pass.
E2E-1 to E2E-3 were walked in a real browser against a local database (43
checks, all passing) but are not yet a CI job.
MT-8 passed on 29 September 2026: all 26 pages at 390px wide, as a visitor,
a group owner and the site admin, with no sideways scrolling.
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
| PT-19 | Nobody can update or delete a moderation log row; deleting a person or group in it only clears that id | Log isn't append-only, or organizers can never be deleted |
| PT-20 | No table readable by other users contains an email address | FR-AC-5 broken |
| PT-21 | The rate limits in TR-SEC-8 refuse the request over the limit: posts, joins, reports, new groups and claims each have a test | Limits missing or wrong |
| PT-22 | No trigger function or internal helper (moderation log writer, rate limiter) can be called through the API, and every function pins its search path | Fake moderation log entries; functions hijackable |
| PT-23 | Nobody can join, RSVP to or post events in an unclaimed listing, and nobody signed in can make one or set a source link | Listings behave like ownerless groups anyone can take over |
| PT-24 | Only the site admin approves a claim; approval makes the claimant owner and declines the other claims; claimants see only their own | Anyone can seize a listed group |
| PT-25 | Only the site admin can see, list or skip candidates; listing makes an unclaimed group with its events and affinity tags | Anyone can push research finds onto the board |
| PT-26 | Adding a candidate validates every field and skips duplicates of candidates and board groups | Bad or repeated agent output lands in the review queue |
| PT-27 | Only owners and admins change a group's affinity tags, and only to tags on the list | Anyone can relabel a group |
| PT-28 | An account cannot clear its display name, through the API or through onboarding, and an account without one cannot post, join or RSVP (FR-AC-3) | An unnameable member posts and cannot be reported or reached by a moderator |
| PT-29 | A group owner or admin reading their group's reports cannot obtain the reporter's identity; the site admin can (FR-MD-8) | The person reported learns who reported them |
| PT-30 | A group that was removed when its owner deleted their account is marked as needing an owner, so restoring it never produces an active group with no owner (FR-GR-10) | A live group nobody can run, moderate or claim |
| PT-31 | Claim requests are rate limited like every other write (TR-SEC-8) | One account floods the site admin's claim queue |
| PT-32 | An RSVP in an archived group cannot be changed, not just created (FR-GR-6) | "Read-only" is not read-only |
| PT-33 | Leaving a group clears the person's RSVPs to its future events and keeps past ones (FR-MB-3) | Someone who left still holds a place and shows as going |
| PT-34 | No permission rule calls auth.uid() or is_site_admin() once per row (Supabase advisor auth_rls_initplan) | Listing pages slow down as the board grows |
| PT-35 | Only a group's owner or admins decline a join request, and declining removes it (FR-MB-2) | Anyone can turn away a group's applicants |
| PT-36 | Only the owner restores an archived group; only the site admin restores a removed one; restoring is logged (FR-GR-6, FR-MD-3) | An admin reopens a group the owner closed, or an owner undoes a removal |
| PT-37 | Authors delete only their own threads and replies, which are blanked rather than removed (FR-DS-4) | One member deletes another's posts, or a thread loses its replies |
| PT-38 | Only the site admin unsuspends an account, after which it can write again (FR-MD-3) | Anyone lifts a suspension |
| PT-39 | Every SECURITY DEFINER function in the public schema is on a reviewed list, and a new one fails by name | A function that skips RLS ships without review |
| PT-40 | A find with a similar name or the same website as something already known is kept and tagged as a possible duplicate; an exact name match is dropped; shared sites like Facebook never count as the same website (FR-RS-10) | Near duplicates listed twice, or real groups lost |
| PT-41 | Events found for an unclaimed listing publish without review only from a group find whose event links are on the listing's own website (FR-RS-8) | A web page tricks the agent into putting a phishing link on a live listing |
| PT-42 | Only a group's owner and admins set its website, and only http(s) addresses are stored (FR-GR-23) | A member points the group's link somewhere else, or a script link is stored |
| PT-60 | A third page manager (admin) is refused by the database, through set_member_role or any direct write (FR-MB-11) | A group ends up with more managers than the page admin agreed to |
| PT-61 | Only the page admin (owner) changes roles or invites a page manager by email (FR-MB-11, FR-MB-12) | A manager makes more managers |
| PT-62 | Open manager invites count toward the limit of two; only the page admin lists or cancels them; only the invited address can accept one, once; no invite address is readable through the API (FR-MB-12) | A forwarded manager invite hands the group to a stranger |
| PT-63 | Only the page admin and managers make an invite link (7 days, 30 days or until turned off); members, applicants, outsiders and visitors cannot read it; one link per group, a new one replaces the old (FR-MB-15) | Anyone can mint or read a group's join link |
| PT-64 | Only the page admin and managers turn off the invite link, after which it joins nobody (FR-MB-15) | A leaked link can't be stopped |
| PT-65 | Joining by link makes you an active member at once, even in an approval group, and approves a waiting request; a visitor holding a working code sees only the group's name and slug (FR-MB-14) | The link only files a join request |
| PT-66 | A replaced, turned-off, expired or made-up link joins nobody and previews nothing; banned, suspended and not-onboarded accounts and archived groups are refused (FR-MB-14) | A banned member walks back in through a link |
| PT-67 | Joining by invite counts toward the 20-joins-a-day limit (FR-MB-16, TR-SEC-8) | Invite links bypass the join rate limit |
| PT-68 | Member email invites: page admin and managers only, at most 25 per send and 100 a day per group, duplicates and repeats within 30 days skipped (FR-MB-13) | The board becomes a spam relay |
| PT-69 | Ownership still goes only to a manager and works with two managers; links and invites are written to the moderation log; invite addresses are purged after 30 days and the purge is not callable through the API (FR-MB-6, FR-MB-16) | Invites leave no trail, or addresses are kept forever |

## Automated — unit

Run by the unit test command in CI. Pure functions only.

| ID | Unit | Assertion |
| --- | --- | --- |
| UT-1 | Plain-text renderer | `<script>` is shown as text; URLs become links with `rel="nofollow ugc noopener"`; line breaks are kept |
| UT-2 | Event time formatting | An event stored in UTC displays in its own time zone, including across a daylight-saving change |
| UT-3 | `.ics` generator | Output has the correct start, end, time zone, title and location |
| UT-4 | Slug generator | Two groups called "Trail Friends" get distinct slugs; slugs are lowercase and URL-safe |
| UT-5 | Zod schemas | Each form schema rejects missing required fields and over-length text; affinity tags accept only the four on the list |
| UT-6 | Page number parser | A page beyond the last is clamped, so no query asks for a huge offset (TR-SEC-12) |
| UT-7 | `.ics` line folding | Folding counts UTF-8 bytes, not characters, and never splits an emoji in a title |
| UT-8 | Password rules (FR-AC-17) | Under 10 characters or over 72 bytes is refused; passwords are never trimmed; the common-password list is refused whatever the case; both copies must match; each failure names its rule |
| UT-9 | Sign-in limiter (FR-AC-19) | 5 failures for an address in 15 minutes pause it, case and spaces ignored; the pause lifts 15 minutes later; spread-out failures and a successful sign-in reset it; memory stays bounded |

## Automated — end to end

Playwright in CI against the local stack with seed data.

| ID | Journey | Passes when |
| --- | --- | --- |
| E2E-1 | UC-1, signed out | Home → subcategory → group → event in three clicks; no sign-in prompt |
| E2E-2 | UC-2, UC-29 | Create an account, confirm it from the local email catcher, accept terms, join, RSVP, return to the event page showing "going"; sign out and back in with the password |
| E2E-3 | Browse with JavaScript off | Home, listing, group and event pages render fully |
| E2E-4 | UC-8, claim a listing | Signed in, ask to claim a listing; as the site admin approve it; the claimant's group page shows them as owner |
| E2E-5 | UC-9, list a candidate | As the site admin, *List it* on a candidate; the group page shows the unclaimed listing with its tags and upcoming events |

## Manual — before launch

| ID | Check |
| --- | --- |
| MT-1 | Walk every approved use case on the production site with seed data |
| MT-2 | Confirmation and password reset emails arrive in Gmail and Outlook inboxes, not spam |
| MT-10 | UC-29 on production: sign up with a new address (page says *Check your email*), and again with the same address (same page, nothing revealed); an unconfirmed account cannot sign in; 5 wrong passwords pause sign-in for that address; *Forgot password* answers the same for an unknown address; the reset link sets a new password and signs out a second browser; *Set a new password* without the link sends you to *Forgot password*; a wrong current password on the profile page changes nothing |
| MT-3 | Lighthouse mobile: performance and accessibility at or above target (TR-PERF-3, TR-A11Y) |
| MT-4 | Keyboard-only pass through join, RSVP and post |
| MT-5 | Supabase security advisor reports no errors (TR-SEC-10) |
| MT-6 | Supabase project is on Pro and backups are listed (TR-OPS-2) |
| MT-7 | Shared group and event links show correct previews in iMessage and Slack |
| MT-8 | Every page at phone width (390px): no sideways scrolling, and buttons and links meet the 24px minimum tap size (WCAG 2.2) |
| MT-9 | After the first weekly research run: the session summary lists its searches and results, new candidates appear on the admin page, and none of them holds an email address, phone number or person's name |

## Planned — pending use case review

Draft use cases UC-10 to UC-28 and UC-30 are not approved yet, so these have no
requirement numbers. They show what each would have to prove; they become
real tests, with requirements, once the use case is approved.

| Use case | Would test |
| --- | --- |
| UC-10 Post a ride series | Only a group's owner and admins create or edit a series; editing the series changes only dates still to come; each date takes its own RSVPs and shows places left; pictures are images only and re-encoded; a sponsor must be a business on the board |
| UC-11 Ask before you go | Only signed-in users ask; only the group's admins answer or move an answer to the FAQ; unanswered questions are not shown to others; questions follow the post rate limit |
| UC-12 A bike shop on the board | Businesses are claimed like groups and only the site admin approves; only the business's owner and admins edit it; only the owner adds or removes admins; a business admin has no rights in its linked group and the reverse; a group link needs the group owner's acceptance; no event exists without a group; a business never appears in group listings or above groups; no prices or booking |
| UC-13 A local chapter of a national club | Only a chapter's owner links it to a national organization; the national page lists only chapters that linked themselves |
| UC-14 What's near me? | A zip code finds results with no outside request; distance shown on each result; the *Near you* town is never stored on the server; filtered links reopen the same list |
| UC-15 Explore destinations | Every place is reachable from the list with the map off; place pages list only that place's groups and upcoming events |
| UC-16 Keep our member list private | With *organizers only*, a member gets no other members' names from the database, on the members tab or on *who's going* |
| UC-17 Approve who comes | A member can't approve their own RSVP; going never exceeds places with two admins acting at once; only admins open Manage RSVPs |
| UC-18 My calendar | Shows only the user's going and saved events; works without JavaScript |
| UC-19 Reply to a reply | Never more than one level of indent; role labels only on owner and admin posts |
| UC-20 Message another member | A second message before acceptance is refused; a blocked user's message is refused; a third user, group admins included, reads nothing; the 11th request in a day is refused |
| UC-21 Share trip photos | A non-member gets no photo from a members-only gallery, from the database or storage; uploads are re-encoded and stripped of location data; only the uploader and organizers remove photos |
| UC-22 Save it for later | No other user, organizer included, can read someone's saved events |
| UC-23 What needs my attention | The list holds only items that need this user; handled items drop off; nothing is sent by email or push without opt-in |
| UC-24 Tell groups apart | A type outside the list is refused; only the owner sets type and photo; the type filter matches the type shown |
| UC-25 A sign-in email that sounds like us | The email comes from the board's domain with no images or tracked links; an expired or used link signs nobody in |
| UC-26 Prove it's my club | A confirmation at a domain other than the group's website is refused; a used or expired link confirms nothing; no full address is kept afterwards; a confirmed claim is never approved automatically |
| UC-27 Start your first group | A group waiting for review is returned to nobody but its owner and the site admin; joins are refused; only the site admin approves or declines; a person with an approved group skips review |

