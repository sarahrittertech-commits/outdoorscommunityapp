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
| FR-BR-1 | A *Browse all* page (`/browse`) lists every category with its subcategories and the number of active groups in each, on one page. The home page links to it from its row of activities. | Must | Signed out, `/browse` shows all categories and subcategories with correct counts. |
| FR-BR-9 | The home page leads with search (activity and keyword), then every activity as a line drawing linking to its category, then the next upcoming events. | Should | Signed out, the home page shows the search, all eleven activities plus *Browse all*, and the next eight events soonest first. |
| FR-BR-10 | A *Communities* page lists every active group A to Z in one table (name, activity, area, members, next event), filterable by activity. | Should | Filtering by an activity shows only its groups, still A to Z. |
| FR-BR-2 | A subcategory page lists its groups alphabetically. Each row shows name, area, member count and next event date (or "no upcoming events"). 50 per page, numbered pages. | Must | A subcategory with 60 groups shows two pages; order is A→Z; the sort order is stated on the page. |
| FR-BR-3 | A category page lists all groups across its subcategories, same format as FR-BR-2. | Should | Groups from every subcategory appear, alphabetically. |
| FR-BR-4 | An *Upcoming events* page lists public events across all groups in date order, grouped by month, filterable by category and by window (next 7 days, 30 days or 3 months; 30 by default). | Should | Events appear soonest first; cancelled and past events do not appear. |
| FR-BR-5 | Keyword search over group names and descriptions and event titles. | Should | Searching "kayak" finds a group with "kayaking" in its description. |
| FR-BR-6 | A group page shows name, description, subcategory, area, organizers (owner and admins), member count, join policy, upcoming events, count of past events and the join button. Readable signed out. | Must | Signed out, all of those are visible; discussions and the member list are not. |
| FR-BR-7 | An event page shows title, host group, date and time with time zone, location name, address (subject to FR-EV-1 visibility), description and the number going. Readable signed out. | Must | Signed out, a members-only address is replaced by "address shown to group members". |
| FR-BR-8 | No personalization in listings. Every list is in a stated, fixed order and is the same for every viewer. | Must | Two different signed-in users see identical listing pages. |
| FR-BR-11 | Filter listings by region. | Could | Only needed if more than one region launches. |

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
| FR-GR-9 | **Unclaimed listings.** Real local groups can be listed from public information before their organizers join, so the board isn't empty at launch. A listing holds only a name, a neutral description, an area and a link to the organization's own website, plus upcoming events that link to the organizer's own page. Nobody runs it here, so it has no owner and nobody can join it, RSVP to its events or post in it. Listings are added by the operator in SQL, never through the app. | Must | A listing's page says it is unclaimed and links to the source; no Join or RSVP is offered and the database refuses both. |
| FR-GR-11 | **Affinity tags.** A group can carry any of these tags: *Women*, *Youth*, *BIPOC*, *LGBTQIA+*. They show on the group page and in group lists. The owner and admins can change them on the group's edit form; listings get them from the import or the research agent. | Should | A tag outside the list is refused by the database. |
| FR-GR-10 | **Claiming a listing.** A signed-in user can ask to claim a listing with a short note on how they're connected. The site admin checks it against the organization's website and approves (the claimant becomes owner, discussions open, other claims are declined) or declines. | Must | Only the site admin can approve; an approved claimant owns the group and it becomes an ordinary group. |

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

## Research agent — FR-RS

Supports [UC-9](./use-cases#uc-9--keep-the-listings-fresh). The agent is
an operator tool: it suggests, the site admin decides. (FR-RS-7 was
retired before build: women-only and youth groups are listed like any
other, with affinity tags.)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-RS-1 | Once a week a scheduled research session searches the public web for each activity on the board, in Western North Carolina every week and in a wider Southeast ring (the rest of North Carolina, South Carolina and Georgia, Tennessee, Virginia and Kentucky) in turn: groups, their upcoming events, guides, businesses and venues. It reads only public pages that allow it: no signing in, no scraping behind sign-ins. | Should | A week's run leaves new candidates, or none, without touching the public site. |
| FR-RS-2 | Each find is saved as a *candidate* in the private research area: kind (group, guide, business, venue), name, activity, area, the public page it came from, a short neutral description, its affinity tags (FR-GR-11) and an out-of-region flag. No contact details, prices, addresses of people or personal names are stored. | Should | The candidate tables have no column for contact details; every field is length- and format-checked by the database. |
| FR-RS-3 | A find that matches an existing candidate, research organization or board group by name is not saved again. A skipped candidate is never suggested again. | Should | Running the same search twice adds nothing the second time. |
| FR-RS-4 | A group candidate carries its upcoming events: title, date, start time, place, time zone and link. Events without a published start time, or already past, are not saved. If no end time is published, the event lasts three hours and says "End time not listed." | Should | — |
| FR-RS-5 | A *Candidates* section on the site admin page lists new group candidates, oldest first, each with its source link, activity, area, affinity tags, out-of-region flag and number of upcoming events, and counts the guides, businesses and venues kept for later. | Should | Only the site admin can see it; the database refuses everyone else. |
| FR-RS-6 | *List it* turns a group candidate into an unclaimed listing (FR-GR-9) with its upcoming events and affinity tags, and marks the candidate listed. *Skip* marks it skipped. | Should | Only the site admin can do either; the database refuses everyone else. |
| FR-RS-8 | New events found later for a group that is still an unclaimed listing are added to it automatically, because the group itself was already approved. Once a group is claimed, its owner runs its events and the agent adds none. | Should | — |
| FR-RS-9 | The agent adds candidates only through one database function that validates every field; it is told never to change other tables. | Should | The function rejects a missing source link, a bad activity or an over-long field. |

## Draft requirements — pending use case review

:::note Drafts, 8 October 2026
These cover the alternative paths and edge cases for draft use cases
UC-10 to UC-24 (most from the 8 October Magic Patterns design). None is
built. Each moves into its area's table above, with a priority, once Sarah
approves its use case and user flow. Priorities here are proposals.
:::

### Events — series, photos, price, sponsors, FAQ (UC-10, UC-11, UC-17, UC-22)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-EV-11 | **Series.** An event can repeat weekly or every two weeks, on chosen days, until an end date (at most a year). Each date is its own event with its own RSVPs and places left. Editing the series offers *this date only* or *this and every later date*; past dates never change. Cancelling one date leaves the rest. | Should | Editing "this and later" changes no date that has started. |
| FR-EV-12 | **Event photo.** One photo per event or series: JPEG, PNG or WebP, at most 5 MB, re-encoded on upload (TR-SEC-9), with required alt text. Without one, the activity's drawing shows. | Should | No original upload is ever served. |
| FR-EV-13 | **Price.** Optional plain text up to 60 characters (*Free*, *$10 trail fee*). The board never takes payment or links to checkout on its own behalf; a link to the organizer's page is allowed in the description. | Should | — |
| FR-EV-14 | **Sponsors.** Up to 5 per event: name, logo (same rules as photos, at most 1 MB), website link with `rel="sponsored noopener"`. Shown in a small *Sponsored by* row on the event page only: never in lists, never affecting order or search. | Should | A sponsored event lists in exactly the same place as an unsponsored one. |
| FR-EV-15 | **RSVP approval.** Owner and admins can set an event to *Approve RSVPs*. A member's RSVP is then a request; only admins approve or decline it. Approved RSVPs count against places; requests don't. | Should | The database refuses a member setting their own RSVP to approved. |
| FR-EV-16 | **Waitlist.** When an event with places is full, members can join the waitlist, in order. An admin moves people from the waitlist to going; there is no automatic move. Replaces FR-EV-10. | Should | Going never exceeds places, even when two admins act at once. |
| FR-EV-17 | **Manage RSVPs page.** Lists requests, going, waitlist and declined, with approve, decline, waitlist and remove. Removing someone is logged like other moderation. | Should | Only the group's owner and admins can open it. |
| FR-EV-18 | **Save.** A signed-in user can save any event they can see, without RSVPing. Saved events are private to that user and listed under *Saved* in My stuff and on their calendar. | Should | No other user, organizer included, can read someone's saved events. |
| FR-EV-19 | **FAQ.** Owner and admins add up to 15 questions and answers to an event or series, in their chosen order. Plain text. | Should | — |
| FR-EV-20 | **RSVPs open at.** An optional date and time before which RSVPs are closed. The page states it plainly ("RSVPs open Tue 14 Oct, 9:00 am"); no ticking countdown. | Should | The database refuses an RSVP before the opening time. |
| FR-EV-21 | **Ask a question.** A signed-in user (member or not) can ask the event's organizers a question, up to 1,000 characters, under the post rate limit. Only the asker and the group's admins see it until it's answered. | Should | A third user sees no unanswered question from anyone else. |
| FR-EV-22 | **Answer and add to FAQ.** Admins answer a question privately, or answer and add it to the FAQ (with the asker's name removed). | Should | — |

### Location, distance and destinations (UC-14, UC-15)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-BR-12 | **Location search.** Search and the Events and Communities pages take a town or a US zip code, matched against a built-in list of places with coordinates. No device location is ever requested (TR-PRIV-1). An unknown place says so and suggests nearby matches. | Should | Typing a zip code finds results without any request to an outside service. |
| FR-BR-13 | **Distance.** *Within 10, 25, 50 or 100 miles*, measured from the chosen place to each group's area and each event's location, as the crow flies, and shown on each result ("12 mi"). Items without a known location are listed after, marked "distance unknown". | Should | — |
| FR-BR-14 | **Near you.** The home page's *Near you* row shows the next upcoming events within 50 miles of a chosen town, which the visitor can change. The choice is remembered in the browser only, never stored against an account. | Should | Clearing the browser's storage resets it; nothing about location is saved on the server. |
| FR-BR-15 | **Shareable filters.** Every filter combination on Events and Communities is in the page address, so a copied link opens the same list. The page title states the filters ("Climbing events within 25 miles of Brevard"). | Should | — |
| FR-BR-16 | **Places.** A list of places (crags, trailheads, put-ins, parks, a shop's storefront) with name, kind, activities, coordinates and a short description, managed by the site admin. Events can name a place; groups and businesses can list places they use. | Should | — |
| FR-BR-17 | **Destinations map.** The home page shows places on a map with a list beside it, filterable by activity and searchable by town. The list alone gives the same information, keyboard- and screen-reader-friendly. | Could | With the map turned off, every place is still reachable from the list. |
| FR-BR-18 | **Place page.** Shows the place, the groups that meet there and its upcoming events. | Should | — |

### Members, calendar, reminders and discussions (UC-16, UC-18, UC-19, UC-23)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-MB-10 | **Member list privacy.** The owner chooses who sees the member list: *organizers only*, *members* (default) or *anyone signed in*. The same rule applies to names on *who's going*; counts are always shown. | Should | The database returns no names the setting doesn't allow, through any route. |
| FR-AC-9 | **Calendar.** The signed-in home page shows the user's going and saved events as a month (computer) or week (phone), switchable, filterable by group and by going or saved. Each entry links to the event. Plain pages: works without JavaScript. | Should | — |
| FR-AC-10 | **Reminders.** A list on the signed-in home page of things that need the user, newest first: join and RSVP requests for groups they run, events they're going to in the next 48 hours, saved events nearly full or newly open for RSVPs, new threads in their groups since their last visit, and message requests and unread messages. Items drop off when handled or past. No email or push unless the user turns it on (FR-NT). | Should | The list contains only items that need this user; nothing is ranked or suggested. |
| FR-DS-9 | **Reply to a reply.** A reply can answer another reply. It shows indented under it, one level only: replies to a nested reply join the same level and name who they answer. Posts by owners and admins carry a role label. Changes FR-DS-2. | Should | No thread ever shows more than one level of indent. |

### Group photos, types and chapters (UC-13, UC-21, UC-24)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-GR-12 | **Photos tab.** Members upload up to 10 photos at a time (image rules as FR-EV-12, required alt text). The gallery shows newest first; any photo opens full size. Visible to members only, unless the owner makes it public. | Could | A non-member gets no photo from the database or storage when the gallery is members-only. |
| FR-GR-13 | **Removing photos.** The uploader can delete their own photos; owner and admins can remove any, logged as moderation. Photos can be reported (FR-MD). | Could | — |
| FR-GR-14 | **Group photo.** The owner picks the group's cover photo from the gallery or uploads one (image rules as FR-EV-12); otherwise the activity's drawing shows. The photo appears on the group page and in the Communities list. | Should | — |
| FR-GR-16 | **Group type.** Every group has one type: *Club*, *Meetup*, *Volunteer group*, *Nonprofit* or *Chapter*, set by the owner (listings get theirs from the import or research agent). It shows as an icon and label on the group page and in lists. | Should | A type outside the list is refused by the database. |
| FR-GR-17 | **Filter by type.** Communities and Events filter by group type, alongside activity, location and audience (affinity tags, FR-GR-11). | Should | — |
| FR-GR-15 | **Chapters.** A group's owner can mark it as a chapter of a national organization from a site-admin-managed list. The organization's page lists its chapters A to Z. | Could | Only the group's owner can link it; the organization can't claim groups. |

### Businesses (UC-12)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-BZ-1 | **Business pages.** Name, description, services (plain list), activities, locations (FR-BR-16 places with role *its location*) and places it operates (role *operates at*), and a website link. No prices, booking or payments. | Could | — |
| FR-BZ-2 | **Listing and claiming.** Businesses come from the research agent's kept candidates, listed by the site admin, and are claimed like groups (FR-GR-10). | Could | — |
| FR-BZ-3 | **Business events.** A business owner can post events at its own locations, marked as hosted by the business. | Could | — |
| FR-BZ-4 | **As sponsors.** A sponsor on an event (FR-EV-14) can link to a business page. | Could | — |
| FR-BZ-5 | **Never above groups.** Businesses have their own directory page; they don't appear in group listings and never affect the order of anything. | Could | — |

### Direct messages (UC-20, ADR-0006)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-DM-1 | **Requests first.** A user's first message to someone arrives as a request. Until it's accepted, the sender can't send another. | Should | The database refuses a second message to someone who hasn't accepted. |
| FR-DM-2 | **Accept, decline, block.** Declining stops that sender messaging again; blocking also hides each from the other in messages. Either side can block at any time. | Should | A blocked user's message is refused by the database. |
| FR-DM-3 | **Inbox.** Conversations newest first, with a *Requests* tab. Plain pages, updated on load; no typing indicators, read receipts or online status. | Should | — |
| FR-DM-4 | **Unread count.** The header shows the number of conversations with unread messages, and nothing else. | Should | — |
| FR-DM-5 | **Report.** Any message can be reported to the site admin with the conversation attached; reports follow FR-MD. | Should | — |
| FR-DM-6 | **Limits.** Plain text only, 2,000 characters; at most 10 new requests a day per user; suspended users can't message. Only the two people in a conversation can read it. | Should | A third user, including group admins, reads nothing; the site admin sees only reported conversations. |
