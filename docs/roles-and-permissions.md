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
are **to a particular group**. A person can be an owner of one group, an admin
of another and a plain member of a third.

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
| **Owner** | Exactly one | Everything an admin can do, plus manage admins, transfer ownership and archive the group |
| **Admin** | Any number | Runs the group day to day: events, join requests, moderation |
| **Member** | Any number | Joins events and discussions |
| **Pending** | — | Asked to join an approval-required group; no member access yet |
| **Banned** | — | Removed by an owner or admin; cannot rejoin |

Meetup has five organizer tiers and Facebook has three. Three is enough here,
and fewer roles means fewer permission rules to get wrong. A separate
*moderator* role can be added later if admins turn out to be doing too much.

## Permission matrix

✅ allowed · ❌ refused · **own** only their own

### Browsing

| Action | Visitor | User (not a member) | Pending | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| See categories, listings, active group pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See public event details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See a members-only event address | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| See the member list | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| See who is going to an event | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Read discussions | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| See an archived group's page | ✅ read-only | ✅ read-only | ✅ read-only | ✅ read-only | ✅ read-only | ✅ | ✅ |
| See a removed group, its members, RSVPs or discussions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Membership

| Action | Visitor | User (not a member) | Pending | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create a group | ❌ | ✅ (limit 3) | — | — | — | — | ✅ |
| Join an open group | ❌ | ✅ unless banned | — | — | — | — | — |
| Request to join an approval group | ❌ | ✅ unless banned | — | — | — | — | — |
| Cancel own request / leave | — | — | ✅ | ✅ | ✅ | ❌ must transfer first | — |
| Approve or decline requests | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Read a join request's answer | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Remove and ban a member | ❌ | ❌ | ❌ | ❌ | ✅ members only | ✅ members and admins | ✅ |
| Promote member → admin, demote admin → member | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Transfer ownership | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ to an admin | ✅ |

### Group settings

| Action | Visitor | User (not a member) | Pending | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edit group details and affinity tags, turn discussions on/off, change join policy | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Archive / restore the group | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Remove the group entirely | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Events

| Action | Visitor | User (not a member) | Pending | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create, edit, cancel events | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| RSVP going / not going | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |

### Discussions (only while discussions are on)

| Action | Visitor | User (not a member) | Pending | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Start a thread, reply (unless locked) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Edit or delete a post | ❌ | ❌ | ❌ | **own** | **own** | **own** | — |
| Pin, lock, remove threads; remove replies | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

When discussions are switched off, **nobody** can post, including the owner.
Existing threads stay readable to members.

### Moderation

| Action | Visitor | User (not a member) | Pending | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Report content | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See reports for a group's content | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
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

### Research candidates (FR-RS-5, FR-RS-6)

| Action | Visitor | User | Site admin |
| --- | --- | --- | --- |
| See candidates | ❌ | ❌ | ✅ |
| List a group candidate | ❌ | ❌ | ✅ |
| Skip a candidate | ❌ | ❌ | ✅ |
| Add a candidate | ❌ | ❌ | ❌ research agent only |

### Proposed with the 8 October design (drafts, not built)

These follow the draft requirements for UC-10 to UC-28. Each becomes part
of the matrix above, with a permission test, once its use case is
approved.

| Action | Visitor | User (not a member) | Member | Admin | Owner | Site admin |
| --- | --- | --- | --- | --- | --- | --- |
| Search by town or zip and distance, see *Near you* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See the destinations map and place pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage the places list | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| See a group's type and photo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Set the group's type, photo and member list privacy | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| See the member list and names on *who's going* | ❌ | per setting | per setting | ✅ | ✅ | ✅ |
| Post an event series, photo, price, sponsors, FAQ, RSVP opening time | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ask an event a question | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read and answer questions, move answers to the FAQ | ❌ | ❌ own only | ❌ own only | ✅ | ✅ | ✅ |
| RSVP to an approval event (request) or join a waitlist | ❌ | ❌ | ✅ | ✅ | ✅ | — |
| Approve, decline, waitlist or remove RSVPs | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Save an event; see own saved events and calendar | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| See someone else's saved events | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| See own reminders | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reply to a reply | ❌ | ❌ | ✅ | ✅ | ✅ | — |
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
| See a group waiting for review (UC-27) | ❌ | ❌ | — | — | ✅ | ✅ |
| Join a group waiting for review | ❌ | ❌ | — | — | — | ❌ |
| Approve or decline a new group | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Group admins never read members' private messages or saved events.

## Cross-cutting rules

- **Suspended users** keep the read access their group roles give them and
  lose every write: no posting, joining, RSVPing, creating or reporting.
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
