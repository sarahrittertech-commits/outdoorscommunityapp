---
sidebar_position: 5
title: Functional requirements
---

# Functional requirements

What the board does, requirement by requirement. Each has an ID used by the
[use cases](./use-cases) and [test cases](./test-cases), a priority and an
acceptance criterion.

| Priority | Meaning |
| --- | --- |
| **Must** | In the MVP. The board does not launch without it. |
| **Should** | Next after the Musts are finished. |
| **Could** | Cut without discussion if anything is at risk. |

Who is allowed to do each action is defined once, in
[Roles and permissions](./roles-and-permissions), rather than repeated here.

## Browse and discovery — FR-BR

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-BR-1 | The home page lists every category with its subcategories and the number of active groups in each, on one page. | Must | Signed out, the home page shows all categories and subcategories with correct counts, without scrolling past anything else first. |
| FR-BR-2 | A subcategory page lists its groups alphabetically. Each row shows name, area, member count and next event date (or "no upcoming events"). 50 per page, numbered pages. | Must | A subcategory with 60 groups shows two pages; order is A→Z; the sort order is stated on the page. |
| FR-BR-3 | A category page lists all groups across its subcategories, same format as FR-BR-2. | Should | Groups from every subcategory appear, alphabetically. |
| FR-BR-4 | An *Upcoming events* page lists public events across all groups in date order for the next 30 days, filterable by category. | Should | Events appear soonest first; cancelled and past events do not appear. |
| FR-BR-5 | Keyword search over group names and descriptions and event titles. | Should | Searching "kayak" finds a group with "kayaking" in its description. |
| FR-BR-6 | A group page shows name, description, subcategory, area, organizers (owner and admins), member count, join policy, upcoming events, count of past events and the join button. Readable signed out. | Must | Signed out, all of those are visible; discussions and the member list are not. |
| FR-BR-7 | An event page shows title, host group, date and time with time zone, location name, address (subject to FR-EV-1 visibility), description and the number going. Readable signed out. | Must | Signed out, a members-only address is replaced by "address shown to group members". |
| FR-BR-8 | No personalization in listings. Every list is in a stated, fixed order and is the same for every viewer. | Must | Two different signed-in users see identical listing pages. |
| FR-BR-9 | Filter listings by region. | Could | Only needed if more than one region launches. |

## Accounts — FR-AC

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-AC-1 | Sign up and sign in with an emailed one-time link. No passwords. | Must | A new address receives a link that signs it in; the same flow signs in an existing user. |
| FR-AC-2 | On first sign-in, the user confirms they are 18 or older and accepts the terms and community guidelines before doing anything else. | Must | A user who hasn't confirmed cannot join, post or RSVP. |
| FR-AC-3 | Profile: display name (required, 2–40 characters), short bio (optional, 280 characters), general area (optional). No profile photos. | Must | Display name is required at first sign-in and editable later. |
| FR-AC-4 | A public profile page shows display name, bio and area. | Should | Reachable from any post author's name. |
| FR-AC-5 | A user's email address is never shown to any other user, including group admins. | Must | No page or API response available to another user contains it. |
| FR-AC-6 | A user can delete their account. Profile and memberships are removed; their posts remain as "deleted user" so threads still make sense. An owner must transfer or archive their groups first. | Must | After deletion the user cannot sign in, and their name appears nowhere. |
| FR-AC-7 | *My stuff* page: the user's groups (alphabetical) and upcoming RSVPs (by date). | Must | Shows only the signed-in user's own groups and RSVPs. |
| FR-AC-8 | Sign in with Google. | Could | — |

## Groups — FR-GR

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-GR-1 | A signed-in user can create a group: name, description, one subcategory, area, join policy (*open* or *approval required*), discussions on/off and an optional cover image (max 2 MB). The creator becomes its owner. | Must | The new group appears in its subcategory listing with the creator as owner. |
| FR-GR-2 | Every group has a unique, readable URL (`/g/brevard-paddlers`). | Must | Two groups with the same name get distinct URLs. |
| FR-GR-3 | Owner and admins can edit the group's details. | Must | A member cannot. |
| FR-GR-4 | Discussions can be switched off per group. When off, the discussion tab is hidden and no new threads or replies can be posted; existing threads stay readable to members. | Must | With discussions off, a member's attempt to post is refused by the database, not just hidden in the UI. |
| FR-GR-5 | Group rules text, shown on the group page and before joining. | Should | — |
| FR-GR-6 | The owner can archive a group: it leaves the listings, becomes read-only, and can be restored. | Should | An archived group's URL still works and says it is archived. |
| FR-GR-7 | A user can own at most 3 active groups. | Should | Creating a fourth is refused with an explanation. |
| FR-GR-8 | A user's first group is held for site-admin approval before it is listed. | Could | — |

## Membership and roles — FR-MB

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MB-1 | Joining an *open* group makes the user a member immediately. | Must | — |
| FR-MB-2 | Joining an *approval required* group creates a pending request that an owner or admin approves or declines. | Must | A pending user has no member access until approved. |
| FR-MB-3 | Members can leave a group at any time. The owner cannot leave without first transferring ownership. | Must | — |
| FR-MB-4 | Each group has exactly one owner, any number of admins and any number of members. | Must | The database refuses a second owner. |
| FR-MB-5 | The owner can promote a member to admin and demote an admin to member. | Must | An admin cannot promote or demote anyone. |
| FR-MB-6 | The owner can transfer ownership to an admin; the old owner becomes an admin. | Should | — |
| FR-MB-7 | Owner and admins can remove a member. Removal is a ban: the user cannot rejoin or request to join. Admins cannot remove the owner or other admins. | Must | A banned user's join attempt is refused. |
| FR-MB-8 | The member list is visible to members only. Visitors see the count and the organizers. | Must | — |
| FR-MB-9 | Approval-required groups can set one join question; the answer is shown to admins with the request. | Should | — |

## Events and RSVPs — FR-EV

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-EV-1 | Owner and admins create events: title, description, start, end, time zone, location name, address, optional capacity and address visibility (*public* or *members only*). | Must | A members-only address is not readable by non-members through any route, including the database API. |
| FR-EV-2 | Owner and admins can edit or cancel an event. A cancelled event stays visible, marked cancelled, and accepts no RSVPs. | Must | — |
| FR-EV-3 | Members RSVP *going* or *not going* and can change it until the event starts. | Must | RSVPs are refused after the start time. |
| FR-EV-4 | Only active members of the host group can RSVP. | Must | A visitor clicking *Going* is taken to sign in and join first. |
| FR-EV-5 | When an event with a capacity is full, *Going* is closed and the page says "full". | Should | The database refuses the RSVP that would exceed capacity. |
| FR-EV-6 | The list of who is going is visible to group members. | Should | — |
| FR-EV-7 | *Add to calendar* downloads an `.ics` file. | Should | The file opens correctly in Apple, Google and Outlook calendars. |
| FR-EV-8 | Past events remain listed on the group page, newest first. | Should | — |
| FR-EV-9 | *Duplicate event* copies an event's details into a new draft with no date. | Could | — |
| FR-EV-10 | Waitlist for full events. | Could | — |

## Discussions — FR-DS

Forum-style, not chat; see [ADR-0005](./architecture/adr-0005-discussions).

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-DS-1 | When discussions are on, members can start a thread with a title and body. | Must | — |
| FR-DS-2 | Members reply to threads. Replies are flat (no nesting) and read oldest first. | Must | — |
| FR-DS-3 | The board lists threads by most recent reply, pinned threads first, 30 per page. | Must | A new reply moves its thread to the top. |
| FR-DS-4 | Authors can edit and delete their own posts. Edited posts say "edited". Deleted posts read "deleted by author". | Must | — |
| FR-DS-5 | Owner and admins can pin, lock and remove threads and remove replies. Removed content reads "removed by a moderator". Locked threads accept no replies. | Must | — |
| FR-DS-6 | Discussions are readable by group members only. | Must | A signed-in non-member gets nothing from the database, not just an empty page. |
| FR-DS-7 | Post bodies are plain text: line breaks kept, links made clickable, no HTML, no images. 10,000 characters maximum. | Must | A post containing `<script>` displays the text literally. |
| FR-DS-8 | Each event gets its own comment thread. | Could | — |

There are deliberately no likes, reactions or view counts (principle P7).

## Notifications — FR-NT

Email only. No push, no in-app badges (principle P4). Sign-in link emails
are not notifications and are always sent.

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-NT-1 | Every notification email has a one-click unsubscribe, and a settings page lets users switch each type off. | Must (as soon as any FR-NT email ships) | Unsubscribing takes one click and no sign-in. |
| FR-NT-2 | Email the user when their join request is approved. | Should | — |
| FR-NT-3 | Email owner and admins when a join request arrives (at most one email per group per day). | Should | — |
| FR-NT-4 | Email a reminder 24 hours before an event to everyone going. | Should | Each person gets exactly one reminder per event. |
| FR-NT-5 | Email everyone going when an event is cancelled or its time changes. | Should | — |
| FR-NT-6 | Email members when a new event is posted in their group (off by default). | Could | — |

## Moderation and safety — FR-MD

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MD-1 | Any signed-in user can report a group, event, thread, reply or profile, with a reason (spam, harassment, unsafe, off-topic, other) and an optional note. | Must | — |
| FR-MD-2 | Reports on content inside a group go to that group's owner and admins and to the site admin. Reports on a group itself or a profile go to the site admin only. | Must | A group admin sees only their own group's reports. |
| FR-MD-3 | The site admin can remove any content, archive or remove any group, and suspend any account. A suspended user can read but not post, join or RSVP. | Must | — |
| FR-MD-4 | Rate limits on posting, joining, RSVPing, reporting and group creation. | Must | Limits in [Technical requirements](./technical-requirements#security--tr-sec). |
| FR-MD-5 | Terms of use, privacy policy and community guidelines pages, linked from every page footer. | Must | — |
| FR-MD-6 | Every moderation action (remove, ban, suspend, archive) is logged with who, what, when and why. | Should | The site admin can view the log. |
| FR-MD-7 | A user can block another user, hiding that user's posts from them. | Could | — |

## Site administration — FR-AD

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-AD-1 | Categories and subcategories are managed as seed data in a migration, not through a UI. | Must | Changing the list is a reviewed commit. |
| FR-AD-2 | A site-admin report queue shows open reports across the board, oldest first. | Must | — |
| FR-AD-3 | A site-admin stats page shows counts of users, groups, events and RSVPs, read from the database. | Could | — |
