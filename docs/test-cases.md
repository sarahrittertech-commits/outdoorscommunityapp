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
| PT-50 | Owner and admins set an event's description, details, price, RSVP choice, sign-up link and waitlist; members can't (FR-EV-23 to FR-EV-28) | A member edits an event's price or turns off its RSVPs |
| PT-51 | A paid event needs a registration fee; sign-up links are http(s) only; a description is at most 2,000 characters (FR-EV-25, FR-EV-27) | A paid event with no price, or a script link on an event page |
| PT-52 | An event that takes no RSVPs refuses new and changed RSVPs (FR-EV-26) | RSVPs made through the API to an event that says it takes none |
| PT-53 | The waitlist opens only when the event is full, keeps join order set by the database, and waitlisted people don't count as going (FR-EV-28) | A member jumps the queue by sending their own join time |
| PT-54 | Only an owner or admin moves someone from the waitlist to going, only into a free place; a waitlisted member can't move themselves; going never exceeds places (FR-EV-28) | Members skip the waitlist, or an event goes over capacity |
| PT-55 | Leaving the waitlist is always allowed (FR-EV-28) | Someone is stuck on a waitlist |
| PT-56 | Only the group's owner and admins upload event photos; members and outsiders can't (FR-EV-24) | Anyone puts pictures on someone else's event |
| PT-57 | A photo path must name an event of the same group (FR-EV-24) | An admin of one group writes into another group's folder |
| PT-58 | An archived group takes no new event photos (FR-EV-24, FR-GR-6) | A read-only group still changes |
| PT-59 | An event points only at a photo in its own folder, and a photo needs alt text (FR-EV-24) | An event shows another event's photo, or a photo with no description |
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
| PT-70 | Page admins and managers can't dismiss or action a report about their own content or another organizer's; the site admin can; reports about a group are the site admin's; dismissals are logged (FR-MD-2) | An organizer quietly dismisses complaints about themselves |
| PT-71 | remove_member gives anyone who can't moderate the group the same refusal whoever they name (FR-MB-7) | Anyone can probe who is in or banned from a group |
| PT-72 | Ownership can't be transferred to someone who already owns 3 active or archived groups (FR-GR-7) | The 3-group limit is bypassed by transfers |
| PT-73 | Organizers of an archived or removed group can't remove posts, pin, remove members, decline requests, handle reports, change roles or transfer ownership; the site admin still can (FR-GR-6) | "Read-only" groups are still moderated through the API |
| PT-74 | An archived group's event addresses can't be changed or cleared; an active group's still can (FR-GR-6) | Archived groups still change |
| PT-75 | A suspended account can't delete its posts (FR-MD-3) | Suspension doesn't stop all writes |
| PT-76 | Leaving groups doesn't reset the 20-joins-a-day limit; the join log can't be read or written through the API (TR-SEC-8) | The join limit is bypassed by leaving and rejoining |
| PT-77 | The unused group-covers bucket has no upload policies and, when empty, is gone (TR-SEC-9) | Unlimited uploads into an unused public bucket |
| PT-78 | Event listings show only active groups' events; restoring a group lists them again (FR-GR-6) | Archived groups' events still appear on Events and in search |
| PT-79 | Signed-in users can't call raise_rule and a bad time zone still gets its message; the missing indexes exist; approving a claim keeps the claimant's RSVPs | Internal helpers in the API; slow admin pages; a claim drops the new owner's RSVPs |
| PT-80 | A signed-in user, member or not, saves an event they can see, without an RSVP (FR-EV-18) | Saving needs an RSVP or membership |
| PT-81 | Saved events are readable only by the person who saved them, not by the organizer or the site admin; visitors read none (FR-EV-18) | Organizers see who is interested in their events |
| PT-82 | Nobody saves on someone else's behalf; visitors never save (FR-EV-18) | Writes for other people; anonymous writes |
| PT-83 | A suspended account can't save; an event in a removed group can't be saved (FR-EV-18) | Saving bypasses can_write or event visibility |
| PT-84 | Only the saver unsaves; a save can't be edited; the same event can't be saved twice (FR-EV-18) | Other people clear your saves |
| PT-85 | The 501st save is refused (FR-EV-18, TR-SEC-8) | One account fills the table |
| PT-86 | By default members see the member list and a non-member sees only the organizers (FR-MB-10) | The default changes who sees names |
| PT-87 | With *organizers only*, a member sees the organizers and their own row but no other member; counts stay; organizers and the site admin see everyone; a plain member can't change the setting, a page manager can (FR-MB-10) | Names leak through the API when the page hides them |
| PT-88 | With *organizers only*, a member sees no names on who's going and only the waitlist count and their own place; organizers see the names (FR-MB-10, FR-EV-28) | Who's going leaks names the setting hides |
| PT-89 | *Anyone signed in* opens the list and who's going to signed-in non-members but not visitors; values outside the three are refused; a removed group stays hidden (FR-MB-10) | The setting opens more than it says, or reopens removed groups |
| PT-90 | A member answers a top-level reply; the answer sits under it (FR-DS-9) | Answers can't be posted, or float loose in the thread |
| PT-91 | Answering an answer joins the same top-level reply and records who it answers; no reply ever has a nested parent (FR-DS-9) | Threads nest without limit |
| PT-92 | An answer can't point at a reply in another thread, or one that doesn't exist (FR-DS-9) | Replies leak into, or are attached to, other threads |
| PT-93 | Non-members, banned members and signed-out visitors can't answer a reply (FR-DS-6, FR-DS-9) | Outsiders post into a group's discussions |
| PT-94 | Nobody answers a reply in a locked thread or while discussions are off (FR-DS-5, FR-GR-4) | Locks and the discussions switch are bypassed through answers |
| PT-95 | Removing a reply leaves its answers readable (FR-DS-5, FR-DS-9) | A moderator's removal silently takes other people's posts with it |
| PT-96 | A removed reply can't be answered (FR-DS-9) | Removed posts gain new answers |
| PT-97 | An author can't move their reply to another parent (FR-DS-9) | Replies rearranged after the fact |
| PT-98 | Answers count toward the posting rate limit (FR-MD-4, TR-SEC-8) | The rate limit is bypassed through answers |
| PT-99 | Who a reply answers is set by the database only (FR-DS-9) | A post claims to answer someone it doesn't |
| PT-100 | The owner and admins set a group's type (FR-GR-16) | Organizers can't describe their group |
| PT-101 | A type outside the five is refused by the database (FR-GR-16) | Made-up types appear in lists and filters |
| PT-102 | Members, outsiders and visitors can't change a group's type (FR-GR-16) | Anyone relabels someone else's group |
| PT-103 | Visitors read type and cover from group_listings; the view still runs as the caller and nobody writes through it (FR-GR-16, FR-GR-17) | The listing view leaks or accepts writes |
| PT-104 | Only the group's owner and admins upload a cover; members, outsiders and other groups' owners can't, and members can't list the folder (FR-GR-14) | Anyone puts pictures on someone else's group |
| PT-105 | A suspended admin can't upload a cover (FR-GR-14, FR-MD-3) | Suspension doesn't stop uploads |
| PT-106 | Covers go only to `<group_id>/<random>.webp`, no other names or folders (FR-GR-14, TR-SEC-9) | Arbitrary files under a group's folder |
| PT-107 | A group's cover folder holds at most 5 files; old ones can be removed (FR-GR-14, TR-SEC-8) | Unlimited uploads into a public bucket |
| PT-108 | An archived group takes no new cover (FR-GR-14, FR-GR-6) | A read-only group still changes |
| PT-109 | A group points only at a cover in its own folder, and a cover needs alt text (FR-GR-14) | A group shows another group's photo, or a photo with no description |
| PT-110 | A member sends a suggestion; it starts as *new* with no note (FR-AD-4) | Members can't reach the site admin |
| PT-111 | Visitors, suspended accounts and accounts that haven't accepted the terms can't send one (FR-AD-4, TR-SEC-2) | Anonymous or suspended accounts write |
| PT-112 | A member sends only as themselves and can't set a status or the admin's note (FR-AD-4, FR-AD-6) | Suggestions in someone else's name, or self-approved |
| PT-113 | The database refuses a bad kind, a title under 3 or over 120 characters, details over 2,000 and a link that isn't http(s) (FR-AD-4) | A `javascript:` link on the admin page |
| PT-114 | Only the sender and the site admin can read a suggestion; other members, page admins and visitors can't (FR-AD-5) | Suggestions leak to the board |
| PT-115 | The sender and page admins can't change a status, directly or through set_suggestion_status (FR-AD-6) | A member marks their own idea done |
| PT-116 | The site admin marks a suggestion planned with a note, and the sender reads both (FR-AD-6, FR-AD-7) | The member never hears back |
| PT-117 | set_suggestion_status refuses *new* and a note over 500 characters (FR-AD-6) | Bad data through the admin function |
| PT-118 | Five suggestions a day are allowed and the sixth is refused (FR-AD-7, TR-SEC-8) | One account floods the admin queue |
| PT-119 | A member can't backdate a suggestion to slip past the daily limit (FR-AD-7, TR-SEC-8) | The limit is bypassed with an old date |

## Automated — unit

Run by the unit test command in CI. Pure functions only.

| ID | Unit | Assertion |
| --- | --- | --- |
| UT-1 | Plain-text renderer | `<script>` is shown as text; URLs become links with `rel="nofollow ugc noopener"`; line breaks are kept |
| UT-2 | Event time formatting | An event stored in UTC displays in its own time zone, including across a daylight-saving change |
| UT-3 | `.ics` generator | Output has the correct start, end, time zone, title and location |
| UT-4 | Slug generator | Two groups called "Trail Friends" get distinct slugs; slugs are lowercase and URL-safe |
| UT-5 | Zod schemas | Each form schema rejects missing required fields and over-length text; affinity tags accept only the four on the list; a group type only the five, or none |
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

Draft use cases UC-10 to UC-28 and UC-32 are not approved yet, so these have no
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
| UC-17 Approve who comes | A member can't approve their own RSVP; going never exceeds places with two admins acting at once; only admins open Manage RSVPs |
| UC-18 My calendar | Shows only the user's going and saved events; works without JavaScript |
| UC-20 Message another member | A second message before acceptance is refused; a blocked user's message is refused; a third user, group admins included, reads nothing; the 11th request in a day is refused |
| UC-21 Share trip photos | A non-member gets no photo from a members-only gallery, from the database or storage; uploads are re-encoded and stripped of location data; only the uploader and organizers remove photos |
| UC-23 What needs my attention | The list holds only items that need this user; handled items drop off; nothing is sent by email or push without opt-in |
| UC-25 A sign-in email that sounds like us | The email comes from the board's domain with no images or tracked links; an expired or used link signs nobody in |
| UC-26 Prove it's my club | A confirmation at a domain other than the group's website is refused; a used or expired link confirms nothing; no full address is kept afterwards; a confirmed claim is never approved automatically |
| UC-27 Start your first group | A group waiting for review is returned to nobody but its owner and the site admin; joins are refused; only the site admin approves or declines; a person with an approved group skips review |

