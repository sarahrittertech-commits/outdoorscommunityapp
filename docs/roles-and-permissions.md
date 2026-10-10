---
sidebar_position: 7
title: Roles and permissions
---

# Roles and permissions

The one place that says who can do what. The database enforces every row of
this table with row-level security (RLS), and every row has an automated test
(see [Test cases](./test-cases)). If this page and the code disagree, the
code is wrong.

## Roles

There are two kinds of role: what someone is **to the site**, and what they
are **to a particular group**. A person can be the page admin of one group,
a page manager of another and a plain member of a third.

On the site the group's owner is called the **page admin** and its admins
**page managers** (UC-31, 9 October 2026). The database keeps the role names
`owner` and `admin`, so the functions and tests still say owner and admin.

### Site roles

| Role | Who | How they get it |
| --- | --- | --- |
| **Visitor** | Anyone not signed in | — |
| **User** | Signed in, confirmed 18+, accepted terms | Signing up |
| **Suspended user** | A user the site admin has suspended | Site admin action |
| **Site admin** | Sarah | Set directly in the database; there is no UI to grant it |

### Group roles

| Role | Per group | Summary |
| --- | --- | --- |
| **Page admin** (owner) | Exactly one | Everything a page manager can do, plus add and remove page managers, transfer ownership and archive the group |
| **Page manager** (admin) | At most two, counting open manager invites | Runs the group day to day: events, join requests, moderation, invites |
| **Member** | Any number | Joins events and discussions |
| **Pending** | — | Asked to join an approval-required group; no member access yet |
| **Banned** | — | Removed by an owner or admin; cannot rejoin |

Meetup has five organizer tiers and Facebook has three. Three is enough here,
and fewer roles means fewer permission rules to get wrong. A separate
*moderator* role can be added later if admins turn out to be doing too much.

## Permission matrix

✅ allowed · ❌ refused · **own** only their own

### Browsing

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| See categories, listings, active group pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See a group's type and cover photo (FR-GR-14, FR-GR-16) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See public event details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See a members-only event address | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| See the group's organizers | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See the member list and names on *who's going* (FR-MB-10) | ❌ | only if *anyone signed in* | only if *anyone signed in* | ✅ unless *organizers only* | ✅ | ✅ | ✅ |
| See member, going and waitlist counts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read discussions | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| See an archived group's page | ✅ read-only | ✅ read-only | ✅ read-only | ✅ read-only | ✅ read-only | ✅ | ✅ |
| See a removed group, its members, RSVPs or discussions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Membership

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create a group | ❌ | ✅ (limit 3) | — | — | — | — | ✅ |
| Join an open group | ❌ | ✅ unless banned | — | — | — | — | — |
| Request to join an approval group | ❌ | ✅ unless banned | — | — | — | — | — |
| Cancel own request / leave | — | — | ✅ | ✅ | ✅ | ❌ must transfer first | — |
| Approve or decline requests | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Read a join request's answer | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Remove and ban a member | ❌ | ❌ | ❌ | ❌ | ✅ members only | ✅ members and admins | ✅ |
| Make a member a page manager (at most two), or step one down | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Transfer ownership | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ to a page manager who owns fewer than 3 groups (FR-GR-7) | ✅ |

Every ✅ for a page manager or page admin in this table, and for pinning,
removing posts, changing event addresses and handling reports below, holds
only while the group is **active**: the database checks it in
`can_moderate()`, so an archived or removed group's organizers can't
moderate through the API either (FR-GR-6). The site admin can.
`remove_member` checks the caller's role before it looks at the person
named, so it tells a non-admin nothing about who is in the group.

### Invites (UC-31, FR-MB-11 to FR-MB-16)

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Make, see, copy or turn off the group's invite link | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| See which group an invite is for (holding a working code) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Join with an invite link or member email invite (skips approval) | ❌ create an account on the invite page first | ✅ unless banned | ✅ approves the request | — | — | — | — |
| Invite members by email (25 a send, 100 a day per group) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Invite a page manager by email; see or cancel open manager invites | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Accept a manager invite | ❌ | ✅ only the invited address | ✅ only the invited address | ✅ only the invited address | — | — | — |
| See who was invited by email | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ email sender only |

Email invites are stored but not sent until the board's email is set up
(`emailEnabled` in `src/config/site.ts`); the forms show disabled until then.

### Group settings

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edit group details and affinity tags, turn discussions on/off, change join policy | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Set the group's type; add, replace or remove its cover photo (FR-GR-14, FR-GR-16; active groups only, at most 5 cover files) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ type, and can take a cover down; can't upload |
| Choose who sees the member list (FR-MB-10) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Archive / restore the group | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Remove the group entirely | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Events

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create, edit, cancel events | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| RSVP going / not going | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Join or leave an event's waitlist when it is full (FR-EV-28) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Add, replace or remove an event photo; set price, RSVPs, sign-up link, waitlist (FR-EV-24 to FR-EV-28) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Move someone from the waitlist to going, while a place is free (FR-EV-28) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ask to go to an event that approves RSVPs; withdraw the request (FR-EV-15) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Turn on Approve RSVPs; set when RSVPs open (FR-EV-15, FR-EV-20) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| RSVP before RSVPs open (FR-EV-20) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| See other people's requests and declines (FR-EV-15) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Open Manage RSVPs; approve, decline, waitlist or remove an RSVP, removals logged (FR-EV-17) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Undo a decline of their own RSVP | ❌ | ❌ | ❌ | ❌ | — | — | — |
| Edit an event's FAQ, add or remove sponsors (FR-EV-14, FR-EV-19) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Read an event's FAQ and sponsors | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Save an event they can see, unsave it, see their own saved events (FR-EV-18) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See someone else's saved events | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Discussions (only while discussions are on)

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Start a thread, reply (unless locked) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Reply to a reply, one level (unless locked; UC-19, FR-DS-9) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Edit or delete a post | ❌ | ❌ | ❌ | **own** | **own** | **own** | — |
| Pin, lock, remove threads; remove replies | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

When discussions are switched off, **nobody** can post, including the owner.
Existing threads stay readable to members.

### Moderation

| Action | Visitor | User (not a member) | Pending | Member | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Report content | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See reports for a group's content | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Dismiss or action a report on a member's post or event (dismissals are logged) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Dismiss or action a report on their own content or another organizer's | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| See who reported something (FR-MD-8) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| See all reports, suspend accounts, view moderation log | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Unclaimed listings and groups without an owner (FR-GR-9, FR-GR-10, FR-AC-6)

A listing has no owner, admins or members, so only these columns apply. A
group whose owner deleted their account is archived (read-only) and can be
claimed the same way; its remaining admins and members are users here.

| Action | Visitor | User | Site admin |
| --- | --- | --- | --- |
| See a listing, its events and its website link | ✅ | ✅ | ✅ |
| Join it, RSVP to its events, post in it | ❌ | ❌ | ❌ |
| Ask to claim it (a listing, or a group that needs an owner) | ❌ | ✅ once | ✅ |
| See a claim | ❌ | **own** | ✅ all |
| Approve or decline a claim | ❌ | ❌ | ✅ |
| Add a listing or set a source link | ❌ | ❌ | ❌ operator SQL only |

### A person's first group (UC-27, FR-GR-8, FR-GR-21)

Built 9 October 2026. A first-time organizer's group waits for the site
admin before it is listed. It has no members yet but its page admin and
any page managers.

| Action | Visitor | User | Page manager | Page admin | Site admin |
| --- | --- | --- | --- | --- | --- |
| See a group waiting for review, or declined, and its events | ❌ | ❌ | ✅ | ✅ | ✅ |
| Join it, by the button or an invite link | ❌ | ❌ | — | — | ❌ |
| Edit it and post events while it waits | ❌ | ❌ | ✅ | ✅ | ✅ |
| Edit a declined group or post in it | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete a declined group | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve or decline a new group (logged) | ❌ | ❌ | ❌ | ❌ | ✅ |

A person skips review once they started or own an approved group, or had
a claim approved.

### Research candidates (FR-RS-5, FR-RS-6)

| Action | Visitor | User | Site admin |
| --- | --- | --- | --- |
| See candidates | ❌ | ❌ | ✅ |
| List a group candidate | ❌ | ❌ | ✅ |
| Skip a candidate | ❌ | ❌ | ✅ |
| Add a candidate | ❌ | ❌ | ❌ research agent only |

### Group photos (UC-21, FR-GR-12, FR-GR-13)

Built 9 October 2026. *Admin* is a page manager, *Owner* the page admin.
The database and the private `group-photos` bucket enforce every row.

| Action | Visitor | User (not a member) | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- |
| See a members-only gallery and its files | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| See a gallery the page admin made public | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add photos (active group; 20 a day, 200 per gallery) | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Delete a photo (active group) | ❌ | ❌ | **own** | ✅ any, logged | ✅ any, logged | ✅ any, logged |
| Report a photo | ❌ | public galleries only | ✅ | ✅ | ✅ | ✅ |
| Make the gallery public or members-only | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Suggestions to the site admin (UC-32, FR-AD-4 to FR-AD-7)

Built 9 October 2026. Page admins and page managers are users here: being
an organizer gives no access to anyone's suggestions.

| Action | Visitor | User | Site admin |
| --- | --- | --- | --- |
| Send a suggestion | ❌ signs in first | ✅ as themselves, 5 a day | ✅ |
| Read a suggestion and its note | ❌ | **own** | ✅ all |
| Set planned, done or declined, with a note | ❌ | ❌ | ✅ through `set_suggestion_status` only |
| Edit or delete a suggestion | ❌ | ❌ | ❌ |

### Direct messages (UC-20, FR-DM-1 to FR-DM-6)

Built 9 October 2026. Group roles give nothing here: a page admin or page
manager is a user like any other, and can't read members' messages.

| Action | Visitor | User | Suspended | Site admin |
| --- | --- | --- | --- | --- |
| Send a first message (a request) | ❌ signs in first | ✅ 10 a day | ❌ | ✅ as a user |
| Write in an accepted conversation | ❌ | **own**, 20 in 10 minutes | ❌ | **own** |
| Accept a request | ❌ | **own** (as recipient) | ❌ | **own** |
| Decline a request, block or unblock someone | ❌ | **own** | ✅ **own** | **own** |
| Read a conversation | ❌ | **own** | ✅ **own** | **own**, and any with a reported message |
| See who blocked them, or when the other person read | ❌ | ❌ | ❌ | ❌ |
| Report a message | ❌ | **own conversations** | ❌ | **own conversations** |
| See message reports | ❌ | ❌ | ❌ | ✅ (no group's organizers) |

### Proposed with the 8 October design (drafts, not built)

These follow the draft requirements for UC-10 (series only), UC-11 to UC-13, UC-23, UC-25, UC-26, UC-28 and UC-33. Each becomes part
of the matrix above, with a permission test, once its use case is
approved.

| Action | Visitor | User (not a member) | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- |
| Search by town or zip and distance, see *Near you* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See the destinations map and place pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage the places list | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post an event series (photo and price built with UC-30; sponsors, FAQ and RSVP opening time with UC-10) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ask an event a question | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read and answer questions, move answers to the FAQ | ❌ | ❌ own only | ❌ own only | ✅ | ✅ | ✅ |
| See own going and saved events on a calendar (built with UC-18; saving with UC-22) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See own reminders | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reply to a reply (built with UC-19; see Discussions) | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Upload photos to the group gallery | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| See a members-only gallery | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Remove a gallery photo | ❌ | ❌ | **own** | ✅ | ✅ | ✅ |
| Send a message request | ❌ | ✅ (10 a day) | ✅ | ✅ | ✅ | ✅ |
| Accept, decline or block a request | ❌ | **own** | **own** | **own** | **own** | **own** |
| Read a conversation | ❌ | **own** | **own** | **own** | **own** | reported only |
| Link a group to a national organization | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Edit a business page | ❌ | business owner and admins only | — | — | — | ✅ |
| Add or remove a business page's admins | ❌ | business owner only | — | — | — | ✅ |
| Link a group to a business page | ❌ | business owner, with the group owner's acceptance | — | — | ✅ accepts | ✅ |
| Confirm a claim with a club email (UC-26) | ❌ | **own claim** | — | — | — | — |
| See whether a claim was confirmed, and at which domain | ❌ | **own claim** | — | — | — | ✅ |

Group admins never read members' private messages or saved events.

## Cross-cutting rules

- **Suspended users** keep the read access their group roles give them and
  lose every write: no posting, joining, RSVPing, creating, reporting or
  sending messages. They can still read their messages, decline requests
  and block (UC-20).
- **Archived groups** are read-only for everyone except the owner (who can
  restore) and the site admin.
- **Users who haven't accepted the terms** (FR-AC-2) are treated as visitors
  for every write.
- **Nobody reads anyone else's email address.** It lives only in Supabase's
  auth tables, which the app's public API cannot query.
- **The site admin column is a backstop,** not a daily workflow. Where it says
  ✅ for group actions, that exists for abuse cases.

## How this is enforced

Summarized here; details in the [data model](./data-model) and
[technical requirements](./technical-requirements#security--tr-sec).

1. RLS is on for every table, and a table with no policy for an action refuses
   that action.
2. Policies call a small set of helper functions — "is this user an active
   member of this group", "is this user an admin or owner of this group", "is
   this user the site admin", "is this user allowed to write" — so the rules
   are written once.
3. Rules that span tables (a thread can't be posted when its group has
   discussions off; an RSVP can't exceed capacity) are checked inside the
   database, not in the web app.
4. Members-only event addresses sit in their own table with a members-only
   policy, because RLS protects rows, not individual columns.
5. Each row of the matrix above has a database test that signs in as each role
   and checks the result.
