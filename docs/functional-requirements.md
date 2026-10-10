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
| FR-AC-1 | ~~Sign up and sign in with an emailed one-time link. No passwords.~~ **Replaced by FR-AC-17 to FR-AC-21** (UC-29, ADR-0009), built 9 October 2026. | — | — |
| FR-AC-2 | On first sign-in, the user confirms they are 18 or older and accepts the terms and community guidelines before doing anything else. | Must | A user who hasn't confirmed cannot join, post or RSVP. |
| FR-AC-3 | Profile: display name (required, 2–40 characters), short bio (optional, 280 characters), general area (optional). No profile photos. Required means the database refuses to store a missing or blank one, and an account without a name cannot post, join or RSVP — a member must always be nameable, reportable and reachable by a moderator. | Must | Display name is required at first sign-in and editable later. Clearing it through the API is refused, not silently accepted. |
| FR-AC-4 | A public profile page shows display name, bio and area. | Should | Reachable from any post author's name. |
| FR-AC-5 | A user's email address is never shown to any other user, including group admins. | Must | No page or API response available to another user contains it. |
| FR-AC-6 | A user can delete their account. Profile and memberships are removed; their posts remain as "deleted user" so threads still make sense. An owner can transfer a group to one of its admins first (FR-MB-6). Any group they still own goes inactive: archived (read-only, hidden from listings, still viewable), its upcoming events cancelled, members and posts kept, and open to claims (FR-GR-10). | Must | After deletion the user cannot sign in, and their name appears nowhere. |
| FR-AC-7 | *My stuff* page: the user's groups (alphabetical) and upcoming RSVPs (by date). | Must | Shows only the signed-in user's own groups and RSVPs. |
| FR-AC-8 | Sign in with Google. | Could | — |
| FR-AC-17 | **Create an account.** Email address only; the password is chosen after the confirmation link (FR-AC-18), entered twice. Password rules: at least 10 characters, at most 72 (the bcrypt limit), no other composition rules; a short list of the most common passwords is refused. The page never says whether an address already has an account: it always answers *Check your email*, an unconfirmed existing address gets its confirmation email again, and a confirmed one gets no email (Supabase sends none; a "you already have an account" email needs a custom send-email hook and waits on UC-25's own emails). The confirmation message adds: "Nothing arrived? If you've signed up before, you already have an account: use Forgot password", since Supabase sends nothing to an address that already has an account. | Must | Signing up with an address that already has an account reveals nothing on the page. |
| FR-AC-18 | **Confirm the email, then create the password.** A new account can do nothing until its address is confirmed through the emailed link (Supabase *Confirm email* on). The link opens *Create your password* (password and password again), reachable only straight after the link, then the welcome step. Until then the account has a long random password nobody knows. The link works once, for 24 hours; an expired one offers to send another. Then FR-AC-2 and FR-AC-3 as today. | Must | An unconfirmed account cannot sign in. |
| FR-AC-19 | **Sign in.** Email and password. A wrong address or password gets one message for both ("That email and password don't match"). After 5 failed tries for an address in 15 minutes, sign-in for it pauses for 15 minutes (Supabase Auth's limits plus a per-address check in the sign-in action, kept in server memory: see ADR-0009), with that said plainly. | Must | Repeated wrong passwords are slowed and the page never says which part was wrong. |
| FR-AC-20 | **Forgot password.** Enter the email; the page always answers *If that address has an account, we've sent a link*. The link works once, for 1 hour, and leads to *Set a new password*, which signs the person in; that page only works straight after the link (a one-hour cookie set by the link), never from an ordinary session. Changing a password signs out every other session. | Must | A reset link is single use and expires; other devices are signed out. |
| FR-AC-21 | **Change password** on the profile page: current password, new password twice, same rules as FR-AC-17. Changing it signs out every other session. | Should | A wrong current password changes nothing. |

## Groups — FR-GR

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-GR-1 | A signed-in user can create a group: name, description, one subcategory, area, join policy (*open* or *approval required*), discussions on/off and an optional cover image (max 2 MB). The creator becomes its owner. | Must | The new group appears in its subcategory listing with the creator as owner. |
| FR-GR-2 | Every group has a unique, readable URL (`/g/brevard-paddlers`). | Must | Two groups with the same name get distinct URLs. |
| FR-GR-3 | Owner and admins can edit the group's details. | Must | A member cannot. |
| FR-GR-4 | Discussions can be switched off per group. When off, the discussion tab is hidden and no new threads or replies can be posted; existing threads stay readable to members. | Must | With discussions off, a member's attempt to post is refused by the database, not just hidden in the UI. |
| FR-GR-5 | Group rules text, shown on the group page and before joining. | Should | — |
| FR-GR-6 | The owner can archive a group: it and its events leave the listings (Events, search, home page, sitemap), becomes read-only (its organizers can't moderate it either), and can be restored. Read-only covers changing an answer already given, not just making a new one: an RSVP in an archived group cannot be changed either. | Should | An archived group's URL still works and says it is archived. Flipping an existing RSVP through the API is refused. |
| FR-GR-7 | A user can own at most 3 active groups. | Should | Creating a fourth is refused with an explanation, and so are a transfer or an approved claim that would make a fourth. |
| FR-GR-8 | A user's first group is held for site-admin approval before it is listed. | Could | — *(Draft revision with UC-27, below.)* |
| FR-GR-9 | **Unclaimed listings.** Real local groups can be listed from public information before their organizers join, so the board isn't empty at launch. A listing holds only a name, a neutral description, an area and a link to the organization's own website, plus upcoming events that link to the organizer's own page. Nobody runs it here, so it has no owner and nobody can join it, RSVP to its events or post in it. Listings are added by the operator in SQL, never through the app. | Must | A listing's page says it is unclaimed and links to the source; no Join or RSVP is offered and the database refuses both. |
| FR-GR-11 | **Affinity tags.** A group can carry any of these tags: *Women*, *Youth*, *BIPOC*, *LGBTQIA+*. They show on the group page and in group lists. The owner and admins can change them on the group's edit form; listings get them from the import or the research agent. | Should | A tag outside the list is refused by the database. |
| FR-GR-23 | **Website.** A group can have its own website address, set by the owner and admins on the group form and shown on its own line on the group page ("Website: dirtskrrts.com"), as a link with `rel="nofollow ugc noopener"`. Only http and https addresses are stored; a missing scheme is taken as https. A listing that is claimed keeps the website it was listed with. | Should | Members can't change it; nothing but a web address is accepted. |
| FR-GR-16 | **Group type.** A group can have one type: *Club*, *Meetup*, *Volunteer group*, *Nonprofit* or *Chapter*, set by the owner and admins on the group form. Groups that existed before have none until an organizer picks one; a group without a type shows none. It shows as a line drawing with the type's name beside it on the group page and in Communities. Built 9 October 2026 (UC-24). | Should | A type outside the list is refused by the database; members can't change it. |
| FR-GR-17 | **Filter by type.** Communities filters by group type alongside activity, with plain links that work without JavaScript (`/communities?type=volunteer`). Built 9 October 2026 (UC-24); the Events filter waits for the Events side filters. | Should | The filter shows only groups of that type, and each shows the type it was filtered by. |
| FR-GR-14 | **Cover photo.** *Narrowed 9 October 2026: upload only; picking from the gallery waits on UC-21.* The owner and admins upload one cover photo on the group's edit form: JPEG, PNG or WebP, at most 5 MB, re-encoded to WebP and stripped of location data on upload (TR-SEC-9, as FR-EV-24), with a required short description (alt text). Replaceable and removable. Shown under the group's name on its page and as a thumbnail in Communities; it replaces a sample group's representative photo. Built 9 October 2026 (UC-24). | Should | Only an active group's owner and admins can add or remove its cover, at most 5 files per group; nothing but a re-encoded image is ever served. |
| FR-GR-10 | **Claiming a listing.** A signed-in user can ask to claim a listing, or a group whose owner deleted their account (FR-AC-6), with a short note on how they're connected. The site admin checks it against the organization's website or the group's members and approves (the claimant becomes owner, the group is active again, a listing's discussions open, other claims are declined) or declines. A group without an owner comes back only through a claim, whatever state it was in when the owner left: a group that was removed at the time is still marked as needing one, so restoring it can never produce a live group nobody can run. | Must | Only the site admin can approve; an approved claimant owns the group and it becomes an ordinary group. |

## Membership and roles — FR-MB

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MB-1 | Joining an *open* group makes the user a member immediately. | Must | — |
| FR-MB-2 | Joining an *approval required* group creates a pending request that an owner or admin approves or declines. | Must | A pending user has no member access until approved. |
| FR-MB-3 | Members can leave a group at any time. Leaving clears their RSVPs to the group's future events, as removal does. The owner cannot leave without first transferring ownership. | Must | — |
| FR-MB-4 | Each group has exactly one owner (page admin), at most two admins (page managers, FR-MB-11) and any number of members. | Must | The database refuses a second owner. |
| FR-MB-5 | The owner can promote a member to admin and demote an admin to member. | Must | An admin cannot promote or demote anyone. |
| FR-MB-6 | The owner can transfer ownership to an admin; the old owner becomes an admin. | Should | — |
| FR-MB-7 | Owner and admins can remove a member. Removal is a ban: the user cannot rejoin or request to join. Admins cannot remove the owner or other admins. | Must | A banned user's join attempt is refused. |
| FR-MB-8 | The member list is visible to members only. Visitors see the count and the organizers. | Must | — |
| FR-MB-9 | Approval-required groups can set one join question; the answer is shown to admins with the request. | Should | — |
| FR-MB-10 | **Member list privacy.** In the group's settings the page admin or a page manager chooses who sees the member list: *Members* (the default), *Organizers only* or *Anyone signed in*. The same choice decides who sees names on *who's going*. Organizers are always listed publicly, and the member, going and waitlist counts are always shown. *Built 9 October 2026 (UC-16); set by anyone who can edit the group, not the owner alone as drafted.* | Should | The database returns no names the setting doesn't allow, through any route: the member list, RSVPs and the waitlist. |
| FR-MB-11 | **Page admin and page managers.** A group has one page admin (the owner) and at most two page managers (admins). Managers post and edit events, moderate discussions, approve, remove and ban members. Only the page admin adds or removes managers, transfers ownership (FR-MB-6) and archives the group. | Must | A third manager is refused by the database. |
| FR-MB-12 | **Manager invite by email** (sending waits on email setup, like FR-MB-13). The page admin can invite a co-organizer by email to be a page manager. The invite is single use and works for 7 days; it counts toward the limit of two while it's open. Accepting makes them a member and a manager; the page admin can cancel it. | Should | Only the address it was sent to can accept it. |
| FR-MB-13 | **Member invites by email.** The page admin and managers paste one or many addresses (commas, spaces or new lines; at most 25 per send, 100 a day per group). Each valid address gets one plain email with a join link (FR-MB-14); **sending waits on email setup** (Resend and a domain, ADR-0004), and until then the form is shown disabled and nothing is stored. Addresses are used only to send it: not shown to anyone, not kept after 30 days, never added to a list. An address already invited in the last 30 days is skipped. Invalid addresses are listed back. | Should | One send of 26 addresses is refused; nobody can see who was invited. |
| FR-MB-14 | **Join by invite.** One page, /join/<code>, for links and email invites. It names the group (from `invite_preview()`, which returns only the group's name and slug, and nothing for a bad, turned-off or expired code). Signed out: *<Group> is on <site>*, a line on what the board is, and *Create your account and join* (email, password twice, UC-29's rules) whose confirmation email links back to the same page, or *Sign in*. Signed in but new: the welcome step, then back. Signed in: *<Group> invites you* and a *Join <Group>* button (a POST, so link previews never join anyone or use up an invite); already a member goes straight to the group. Joining makes them a member at once, even in a group that asks people to request to join, and lands on the group page with *Welcome to <Group>*. Banned people can't join this way; removed or archived groups refuse it. | Should | A banned user's invite does nothing; a bad code shows the group to nobody. |
| FR-MB-15 | **Invite link.** The page admin or a manager creates one shareable link per group, valid for 30 days by default (7 days or until turned off as options). The Members page shows it with *Copy* and *Turn off*; turning it off or making a new one stops the old one at once. The link is a long random code, not guessable. | Should | A turned-off or expired link joins nobody. |
| FR-MB-16 | **Invites are moderated like joins.** Joining by invite counts toward the 20-joins-a-day limit (TR-SEC-8), and the moderation log records who created each link and who sent each email invite. | Should | — |

FR-MB-11 to FR-MB-16 came from UC-31, approved and built 9 October 2026. On the site the owner is called the **page admin** and admins are **page managers**; the database keeps owner and admin.

## Events and RSVPs — FR-EV

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-EV-1 | Owner and admins create events: title, description (FR-EV-23), start, end, time zone, location name, address, optional capacity and address visibility (*public* or *members only*). | Must | A members-only address is not readable by non-members through any route, including the database API. |
| FR-EV-2 | Owner and admins can edit or cancel an event. A cancelled event stays visible, marked cancelled, and accepts no RSVPs. | Must | — |
| FR-EV-3 | Members RSVP *going* or *not going* and can change it until the event starts. | Must | RSVPs are refused after the start time. |
| FR-EV-4 | Only active members of the host group can RSVP. | Must | A visitor clicking *Going* is taken to sign in and join first. |
| FR-EV-5 | When an event with a capacity is full, *Going* is closed and the page says "full". | Should | The database refuses the RSVP that would exceed capacity. |
| FR-EV-6 | The list of who is going is visible to group members. | Should | — |
| FR-EV-7 | *Add to calendar* downloads an `.ics` file. | Should | The file opens correctly in Apple, Google and Outlook calendars. |
| FR-EV-8 | Past events remain listed on the group page, newest first. | Should | — |
| FR-EV-9 | *Duplicate event* copies an event's details into a new draft with no date. | Could | — |
| FR-EV-10 | ~~Waitlist for full events.~~ Replaced by FR-EV-28 (built 9 October 2026). | — | — |
| FR-EV-23 | **Description and Details.** *Description* is required (10 to 2,000 characters): what the event is and who it's for, shown first and used in link previews. *Details* stays optional (what to bring, pace, difficulty). Existing events keep their text as Details. Plain text, links work. | Must | An event can't be posted without a description. |
| FR-EV-24 | **Photo.** One optional photo per event, uploaded by the owner or admins: JPEG, PNG or WebP, at most 5 MB, re-encoded and stripped of location data on upload (TR-SEC-9), with a required short description of the picture (alt text). Replaceable and removable. Shown at the top of the event page; events without one show no photo. | Should | Only a group's owner and admins can add or remove an event's photo; nothing but a re-encoded image is ever served. |
| FR-EV-25 | **Free or Paid.** Every event is *Free* or *Paid*. A paid event has a *Registration fee* and a *Total cost*, each plain text up to 80 characters (*$25 registration*, *about $60 with bike rental*), shown together on the event page and in event lists as *Paid*. The board never takes payment. | Should | A paid event can't be posted without a registration fee. |
| FR-EV-26 | **Take RSVPs or not.** *Take RSVPs on Branch Outdoors* is ticked by default. Unticked, the event shows no RSVP buttons and no going count, and takes no RSVPs (the database refuses them). | Should | An event without RSVPs refuses an RSVP made directly through the API. |
| FR-EV-27 | **Sign-up link.** An event without RSVPs can give an optional *Sign up at* link (http or https) to the organizer's own page, shown on the event page with `rel="nofollow ugc noopener"`. | Should | — |
| FR-EV-28 | **Waitlist when full.** An event with places can turn on a waitlist. When it is full, members can join the waitlist, in the order they joined; they see their place in line. The owner and admins move people from the waitlist to *going* on the event page, never automatically, and only while a place is free. Leaving the waitlist is always allowed. Replaces FR-EV-10 and narrows FR-EV-16. | Should | Nobody moves from the waitlist to going without an organizer, and going never exceeds the places. |
| FR-EV-18 | **Save for later.** A signed-in user can save any event they can see, without RSVPing, with *Save for later* on the event page and *Unsave* to undo. Saved events are private to that user and listed under *Saved* in My stuff (upcoming ones, soonest first). At most 500 saves per person. *Built 9 October 2026 (UC-22); the calendar (FR-AC-9) and reminders (FR-AC-10) aren't built, so saved events aren't shown there yet.* | Should | No other user, organizer and site admin included, can read someone's saved events; a visitor can't save. |

## Discussions — FR-DS

Forum-style, not chat; see [ADR-0005](./architecture/adr-0005-discussions).

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-DS-1 | When discussions are on, members can start a thread with a title and body. | Must | — |
| FR-DS-2 | Members reply to threads. Replies read oldest first. Replies were flat; FR-DS-9 adds one level of answers. | Must | — |
| FR-DS-3 | The board lists threads by most recent reply, pinned threads first, 30 per page. | Must | A new reply moves its thread to the top. |
| FR-DS-4 | Authors can edit and delete their own posts. Edited posts say "edited". Deleted posts read "deleted by author". | Must | — |
| FR-DS-5 | Owner and admins can pin, lock and remove threads and remove replies. Removed content reads "removed by a moderator". Locked threads accept no replies. | Must | — |
| FR-DS-6 | Discussions are readable by group members only. | Must | A signed-in non-member gets nothing from the database, not just an empty page. |
| FR-DS-7 | Post bodies are plain text: line breaks kept, links made clickable, no HTML, no images. 10,000 characters maximum. | Must | A post containing `<script>` displays the text literally. |
| FR-DS-8 | Each event gets its own comment thread. | Could | — |
| FR-DS-9 | **Reply to a reply** (UC-19, built 9 October 2026). A member can answer a top-level reply; the answer shows indented under it, one level only. Answering an answer attaches to the same top-level reply and names who it answers. The answered reply must be visible and in the same thread; the posting rules and rate limit are those of FR-DS-2. Removing or deleting a reply leaves its answers readable under the "removed" or "deleted" placeholder. Posts by the page admin and page managers carry a role label. A *reply* link opens the form under that reply without JavaScript. Changes FR-DS-2. | Should | No thread ever shows more than one level of indent (PT-90 to PT-99). |

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
| FR-MD-2 | Reports on content inside a group go to that group's owner and admins and to the site admin, without the reporter's identity (FR-MD-8). Reports on a group itself or a profile go to the site admin only. A report about something a page admin or page manager posted is handled by the site admin only, so nobody clears a report about themselves or a fellow organizer. Dismissing a report is written to the moderation log. | Must | A group admin sees only their own group's reports. |
| FR-MD-3 | The site admin can remove any content, archive or remove any group, and suspend any account. A suspended user can read but not post, join or RSVP. | Must | — |
| FR-MD-4 | Rate limits on posting, joining, RSVPing, reporting, group creation and claim requests. | Must | Limits in [Technical requirements](./technical-requirements#security--tr-sec). |
| FR-MD-5 | Terms of use, privacy policy and community guidelines pages, linked from every page footer. | Must | — |
| FR-MD-6 | Every moderation action (remove, ban, suspend, archive) is logged with who, what, when and why. | Should | The site admin can view the log. |
| FR-MD-7 | A user can block another user, hiding that user's posts from them. | Could | — |
| FR-MD-8 | **Who reported is not shown to the person reported.** Group owners and admins see the reason, the note and what was reported, never who reported it; only the site admin can see that. The report form says so, so the database enforces it rather than relying on pages not to ask. | Must | A group admin querying the API for their group's reports cannot obtain the reporter's identity. |

## Site administration — FR-AD

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-AD-1 | Categories and subcategories are managed as seed data in a migration, not through a UI. | Must | Changing the list is a reviewed commit. |
| FR-AD-2 | A site-admin report queue shows open reports across the board, oldest first. | Must | — |
| FR-AD-3 | A site-admin stats page shows counts of users, groups, events and RSVPs, read from the database. | Could | — |
| FR-AD-4 | **Suggest something** (UC-32, built 9 October 2026). A signed-in member sends a suggestion from /suggest: kind (*region*, *feature*, *group to invite*, *event to add*, *other*), title (3 to 120 characters), details (up to 2,000) and an optional http(s) link. Visitors are asked to sign in first (anonymous visitors never write, TR-SEC-2). The form works without JavaScript and says *Thanks, the site admin reads every suggestion.* The footer and *My stuff* link to it. | Should | Only signed-in, writable accounts can send one, as themselves; the kind must be one of the five. |
| FR-AD-5 | **Private.** A suggestion is readable only by the member who sent it and the site admin. Never shown publicly, never voted on or ranked (product principles). | Must | No other member, organizer or visitor can read it. |
| FR-AD-6 | **Site admin review.** The admin page lists suggestions newest first, filterable by kind, each with its sender (display name, linked to their profile), link and date. The site admin sets *Planned*, *Done* or *Declined*, with an optional note (up to 500 characters) the member can read, through one database function. | Should | Only the site admin can change a status; members can't set one when sending. |
| FR-AD-7 | **Limits.** 5 suggestions per member per day, with the per-person lock and server time every other write has (TR-SEC-8). The member's own list (*My suggestions*) shows each one's status and note. | Should | A sixth suggestion in a day is refused. |

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
| FR-RS-8 | New events found later for a group that is still an unclaimed listing are added to it automatically, because the group itself was already approved, but only when the find is a group and each event's link is on the listing's own website (not a shared site such as Facebook). Other events wait with the candidate for the site admin. Once a group is claimed, its owner runs its events and the agent adds none. | Should | An event whose link is elsewhere never reaches the board without the site admin. |
| FR-RS-10 | **Possible duplicates.** A find with exactly the same name as a candidate, research organization or board group is still dropped silently (FR-RS-3). A find that only looks like one (a similar name, or the same website, shared sites such as Facebook or Meetup excepted) is kept and tagged *possible duplicate* on the admin page, naming what it may duplicate and linking to it, so the site admin compares the two before listing or skipping. | Should | A near match is never listed without review and never silently lost. |
| FR-RS-9 | The agent adds candidates only through one database function that validates every field. It has no database access of its own: it calls an intake (an Edge Function) with a token, and the intake can only list what the board knows and add a candidate. | Should | The function rejects a missing source link, a bad activity or an over-long field. |

## Draft requirements — pending use case review

:::note Drafts, 8 October 2026
These cover the alternative paths and edge cases for draft use cases
UC-10 to UC-13, UC-17, UC-18, UC-20, UC-21, UC-23 and UC-25 to UC-28 (most from the 8 October Magic Patterns design; UC-25 to
UC-27 requested by Sarah the same day and drafted 9 October). None is
built (UC-29, password sign-in, was approved and built on 9 October and
its requirements, FR-AC-17 to FR-AC-21, are in the Accounts table). Each moves into its area's table above, with a priority, once Sarah
approves its use case and user flow. Priorities here are proposals.
:::

### Events — series, photos, price, sponsors, FAQ (UC-10, UC-11, UC-17, UC-22)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-EV-11 | **Series.** An event can repeat weekly or every two weeks, on chosen days, until an end date (at most a year). Each date is its own event with its own RSVPs and places left. Editing the series offers *this date only* or *this and every later date*; past dates never change. Cancelling one date leaves the rest. | Should | Editing "this and later" changes no date that has started. |
| FR-EV-12 | **Event photo.** One photo per event or series: JPEG, PNG or WebP, at most 5 MB, re-encoded on upload (TR-SEC-9), with required alt text. Without one, the activity's drawing shows. *For single events, narrowed to FR-EV-24 and built 9 October 2026; series photos stay draft.* | Should | No original upload is ever served. |
| FR-EV-13 | **Price.** Optional plain text up to 60 characters (*Free*, *$10 trail fee*). The board never takes payment or links to checkout on its own behalf; a link to the organizer's page is allowed in the description. *Narrowed to FR-EV-25 (Free or Paid, fee and total cost) and built 9 October 2026.* | Should | — |
| FR-EV-14 | **Sponsors.** Up to 5 per event: name, logo (same rules as photos, at most 1 MB), website link with `rel="sponsored noopener"`. Shown in a *Sponsored by* section with the sponsors' logos, below the event details, on the event page only: never in lists, never affecting order or search. A sponsor can link to a business or group page on the board. | Should | A sponsored event lists in exactly the same place as an unsponsored one. |
| FR-EV-15 | **RSVP approval.** Owner and admins can set an event to *Approve RSVPs*. A member's RSVP is then a request; only admins approve or decline it. Approved RSVPs count against places; requests don't. | Should | The database refuses a member setting their own RSVP to approved. |
| FR-EV-16 | **Waitlist.** When an event with places is full, members can join the waitlist, in order. An admin moves people from the waitlist to going; there is no automatic move. Replaces FR-EV-10. *Narrowed to FR-EV-28 and built 9 October 2026; the Manage RSVPs page (FR-EV-17) stays draft.* | Should | Going never exceeds places, even when two admins act at once. |
| FR-EV-17 | **Manage RSVPs page.** Lists requests, going, waitlist and declined, with approve, decline, waitlist and remove. Removing someone is logged like other moderation. | Should | Only the group's owner and admins can open it. |
| FR-EV-19 | **FAQ.** Owner and admins add up to 15 questions and answers to an event or series, in their chosen order. Plain text. | Should | — |
| FR-EV-20 | **RSVPs open at.** An optional date and time before which RSVPs are closed. The page states it plainly ("RSVPs open Tue 14 Oct, 9:00 am"); no ticking countdown. | Should | The database refuses an RSVP before the opening time. |
| FR-EV-21 | **Ask a question.** A signed-in user (member or not) can ask the event's organizers a question, up to 1,000 characters, under the post rate limit. Only the asker and the group's admins see it until it's answered. | Should | A third user sees no unanswered question from anyone else. |
| FR-EV-22 | **Answer and add to FAQ.** Admins answer a question privately, or answer and add it to the FAQ (with the asker's name removed). | Should | — |

### Location, distance and destinations (UC-14, UC-15)

:::info Built 9 October 2026
Sarah directed the 8 October design onto the live board, so these were
built ahead of their review. What shipped, against the drafts below:
FR-BR-12 takes a town from a list in `src/config/towns.ts` (no zip codes
yet) on the home page and Events (not Communities yet); FR-BR-13 offers
10, 25, 50, 100 and 250 miles, measured from town center to the group's
town, shown rounded on the home page cards; FR-BR-14 uses 100 miles and
keeps the town in the page address, not the browser; FR-BR-15 covers
Events; FR-BR-17 maps **towns with upcoming events** rather than places,
because FR-BR-16 (places) isn't built. FR-BR-18 waits on FR-BR-16.
Fixed after the 9 October review: the home search defaults to *Anywhere*;
near a town, Events doesn't list events whose group's area isn't a known
town, but says how many it left out and links to all events (FR-BR-13's
"distance unknown" list is not built); each destination's count is the
number of events in the next 90 days within 25 miles, the same list its
link opens.
:::

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
| FR-AC-9 | **Calendar.** The signed-in home page shows the user's going and saved events as a month (computer) or week (phone), switchable, filterable by group and by going or saved. Each entry links to the event. Plain pages: works without JavaScript. | Should | — |
| FR-AC-10 | **Reminders.** A list on the signed-in home page of things that need the user, newest first: join and RSVP requests for groups they run, events they're going to in the next 48 hours, saved events nearly full or newly open for RSVPs, new threads in their groups since their last visit, and message requests and unread messages. Items drop off when handled or past. No email or push unless the user turns it on (FR-NT). | Should | The list contains only items that need this user; nothing is ranked or suggested. |

### Group photos, types and chapters (UC-13, UC-21, UC-24)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-GR-12 | **Photos tab.** Members upload up to 10 photos at a time (image rules as FR-EV-12, required alt text). The gallery shows newest first; any photo opens full size. Visible to members only, unless the owner makes it public. | Could | A non-member gets no photo from the database or storage when the gallery is members-only. |
| FR-GR-13 | **Removing photos.** The uploader can delete their own photos; owner and admins can remove any, logged as moderation. Photos can be reported (FR-MD). | Could | — |
| FR-GR-14 | **Group photo.** The owner picks the group's cover photo from the gallery or uploads one (image rules as FR-EV-12); otherwise the activity's drawing shows. The photo appears on the group page and in the Communities list. *Narrowed (upload only), built 9 October 2026 and moved to the Groups table; picking from the gallery waits on UC-21.* | Should | — |
| FR-GR-16 | *Built 9 October 2026; moved to the Groups table. Listings getting a type from the research agent is not built yet.* | — | — |
| FR-GR-17 | *Built for Communities 9 October 2026; moved to the Groups table. The Events filter and the location and audience filters stay draft.* | — | — |
| FR-GR-15 | **Chapters.** A group's owner can mark it as a chapter of a national organization from a site-admin-managed list. The organization's page lists its chapters A to Z. | Could | Only the group's owner can link it; the organization can't claim groups. |

### Businesses (UC-12)

Businesses are on the board (decided 8 October 2026). They host events
only through a group, so events stay one feature with one set of rules.

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-BZ-1 | **Business pages.** Name, description, services (plain list), activities, locations (FR-BR-16 places with role *its location*) and places it operates (role *operates at*), and a website link. No prices, booking or payments. | Should | — |
| FR-BZ-2 | **Listing and claiming.** Businesses come from the research agent's kept candidates, listed by the site admin, and are claimed like groups (FR-GR-10), by an account signed in with the business's own email. The site admin checks that the email matches the business's website before approving. | Should | Only the site admin can approve a business claim. |
| FR-BZ-3 | **Business admins.** The claiming account owns the page. The owner adds and removes admins, each a person's own account; admins edit the page. Ownership transfers like a group's (FR-MB-6). There is no shared login. | Should | A non-admin can't change a business page, and a removed admin loses access at once. |
| FR-BZ-4 | **The business's group.** A business owner can link one or more groups to the business page; the group's owner must accept the link. The group keeps its own owner, admins and members, separate from the business page's admins. The business page lists its groups and their upcoming events. | Should | Being a business admin gives no rights in its group, and the reverse. |
| FR-BZ-5 | **Events through groups only.** A business page has no events of its own; its events are its group's events, posted and managed as any group's. | Should | The database has no way to post an event without a group. |
| FR-BZ-6 | **As sponsors.** A sponsor on an event (FR-EV-14) can link to a business page; the business page lists the upcoming events it sponsors. | Should | — |
| FR-BZ-7 | **Never above groups.** Businesses have their own directory page; they don't appear in group listings and never affect the order of anything. | Should | A business never appears in the Communities list or changes any list's order. |

### Direct messages (UC-20, ADR-0006)

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-DM-1 | **Requests first.** A user's first message to someone arrives as a request. Until it's accepted, the sender can't send another. | Should | The database refuses a second message to someone who hasn't accepted. |
| FR-DM-2 | **Accept, decline, block.** Declining stops that sender messaging again; blocking also hides each from the other in messages. Either side can block at any time. | Should | A blocked user's message is refused by the database. |
| FR-DM-3 | **Inbox.** Conversations newest first, with a *Requests* tab. Plain pages, updated on load; no typing indicators, read receipts or online status. | Should | — |
| FR-DM-4 | **Unread count.** The header shows the number of conversations with unread messages, and nothing else. | Should | — |
| FR-DM-5 | **Report.** Any message can be reported to the site admin with the conversation attached; reports follow FR-MD. | Should | — |
| FR-DM-6 | **Limits.** Plain text only, 2,000 characters; at most 10 new requests a day per user; suspended users can't message. Only the two people in a conversation can read it. | Should | A third user, including group admins, reads nothing; the site admin sees only reported conversations. |

### Sign-in email (UC-25)

Waits on the domain (PRD open question) and Resend's SMTP settings
(runbook steps 1.5 and 2). It changes the wording and sender of the email
Supabase already sends; it adds no new email. A separate welcome email
after sign-up is not proposed: it would be a second email nobody asked
for (P4) and would count against Resend's 100 emails a day.

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-AC-11 | **Our own sign-in email.** Supabase's two sign-in emails (first sign-in and returning) use the board's own templates: sent from the board's domain as *Branch Outdoors*, subject *Your Branch Outdoors sign-in link*, a one-line welcome on a first sign-in, the link, how long it works, and "If you didn't ask for this, ignore it." A plain-text version is included. No images, no tracking pixels, no click tracking (switched off in Resend), no marketing lines or social links. | Should | A production sign-in email arrives from the board's domain and contains no image and no tracked link. |
| FR-AC-12 | **Templates live in the repository.** The template text is kept in the repository and copied into Supabase's settings when it changes; the site name is a deployment setting, so the women's clone gets its own name ([Cloning](./cloning)). Until the domain and Resend are set up, Supabase's generic emails stay and nothing else changes. | Should | Turning on Resend's SMTP needs no code change. |
| FR-AC-13 | **Used, expired and repeated links.** Links are single use and work for 1 hour. The link opens in any browser, not only the one that asked for it (the sign-in callback already accepts this kind of link). A used or expired link lands on the sign-in page with "That link has expired or was already used. Send a new one." If a work email scanner opens the link first, the same message shows. Asking again within 60 seconds says to wait (Supabase's limit). | Should | An expired link signs nobody in and offers a new one. |

### Claim confirmation by email (UC-26)

Extends FR-GR-10. Also waits on the domain and Resend: the confirmation
is an email sent by the board. The same check could later serve business
claims (FR-BZ-2), which already ask for the business's own email.

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-GR-18 | **Confirm with a club email.** The claim form has an optional address field. It is accepted only at the domain of the group's website (ignoring *www.*; addresses at a subdomain of it count). The field isn't offered when the group has no website, or its website is on a shared service (Facebook, Meetup, Instagram, free site builders); the form says the site admin will check the note instead. Addresses at free email services (Gmail, Outlook.com, Yahoo and the like) are refused with that explanation. If the claimant's own sign-in address is already at the group's domain, the claim counts as confirmed with no extra email, because signing in already proved it. The lists of shared and free services are a setting, not code. | Should | The database refuses to record a confirmation whose domain doesn't match the group's website. |
| FR-GR-19 | **The confirmation link.** Sent from the board's domain through Resend; single use; works for 24 hours. While the claim is waiting, the claimant can send it again twice more. The link confirms the claim and nothing else: it doesn't sign anyone in. A used or expired link says so and, while the claim is waiting, offers to send a new one. The address is kept only until it's confirmed or the last link expires; after that only the domain and the date are kept (FR-AC-5). | Should | A used or expired link confirms nothing, and no full confirmation address is stored once the link is used or expired. |
| FR-GR-20 | **What the site admin sees.** Each claim in the queue shows one of: *Confirmed at brevardpaddlers.org on 9 Oct*; *Not confirmed: link sent 9 Oct, expired* (the claimant never clicked); *Not confirmed: no club email given*; or *Can't confirm: no website of its own*. Confirmation is evidence, never approval: no claim is approved automatically, and the site admin can approve an unconfirmed claim on the strength of the note, as today. When a claim is decided, or another claim on the group is approved, its open link stops working. | Should | Only the site admin approves a claim, confirmed or not. |

### Group creation approval (UC-27)

**Decision needed.** The PRD's open question *Who can create groups*.
Today anyone signed in can start up to 3 groups (FR-GR-7), listed at
once, with rate limits (FR-MD-4) and reports (FR-MD-1) as the safety
net. All three options keep the limit of 3.

| Option | What it means | Consequences | Cost |
| --- | --- | --- | --- |
| **A. Approve every new group** | Every group waits for the site admin before it's listed. | Nothing reaches the listings unchecked. Every organizer waits every time, including people the site admin already trusts; when Sarah is away, nothing new goes live. The most ongoing work for the site admin. | Same build as B. Ongoing: one review per group. |
| **B. Approve only a person's first group** *(recommended)* | A first group waits; once someone has an approved group (or an approved claim), their later groups list at once. | Stops the likely abuse: a throwaway account starting a fake or spam group. Checked organizers are never held up again. Someone approved once could still post a bad group later; reports, suspension and the limit of 3 cover that. | Small: a review status on groups, a *New groups* section on the admin page, one database rule, and its permission tests. Ongoing: one review per new organizer. |
| **C. No approval** (today) | Groups list at once. | Nothing to build or run. A spam group stays listed until someone reports it and the site admin removes it. At the board's current size that risk is low; it grows with traffic. | None. FR-GR-8 is cut. |

Either A or B changes success criterion 3 (*an organizer can create a
group, add a co-admin and post an event without help*): a co-admin has
to join first, and nobody can join a group waiting for review. The
proposed wording is "...without help, once their first group is
approved." The drafts below are written for B.

Related, not in this scope: ownership can only be transferred to an
admin (FR-MB-6). Sarah may want any member to be eligible; that is
listed as its own open question in the PRD.

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-GR-8 | **First group waits for review.** *Replaces the Could.* A user's first group is created *waiting for review*: visible only to its owner and the site admin; absent from listings, search, Events and the home page; nobody can join it. The owner can edit it and post events, which stay hidden with it. A user skips review if they own, or have owned, an approved group, or had a claim approved (FR-GR-10); receiving an approved group by transfer counts too. Owners of groups that exist when this ships count as approved. A group waiting for review counts toward the limit of 3 (FR-GR-7). | Should | The database returns a group waiting for review to nobody but its owner and the site admin, and refuses every join. |
| FR-GR-21 | **New groups queue.** A *New groups* section on the admin page lists groups waiting for review, oldest first: name, description, subcategory, area and the owner's display name (never their email, FR-AC-5). *Approve* lists the group. *Decline* needs a short reason, which the owner sees on the group page; a declined group stays read-only for its owner, who can delete it and start again. Both are logged (FR-MD-6). | Should | Only the site admin can approve or decline; the database refuses everyone else. |
| FR-GR-22 | **Telling the organizer.** The form says before they submit that first groups are checked first. The group page states plainly that it is waiting, and later whether it was approved or declined and why. Once built, the reminders list (FR-AC-10) shows the decision; an email is sent only once the domain exists and the organizer hasn't switched it off (FR-NT-1). No promised waiting time. If the owner deletes their account while the group is waiting, the group is deleted with it, since nothing about it was ever public. | Should | — |

### Demo member (UC-28)

**Decision needed:** read-only demo member on the live board
(recommended), a separate demo board, or none. These drafts are for the
read-only demo.

| ID | Draft requirement | Proposed | Accepted when |
| --- | --- | --- | --- |
| FR-AC-14 | **Demo sign-in.** The sign-in page offers *Look around as a demo member*. It signs the visitor into one shared demo account without an email, through a server action; the account's password lives only in a Railway secret and never reaches the browser. The session lasts at most an hour. | Should | Anyone can open the demo without an email; nobody can sign in as the demo any other way. |
| FR-AC-15 | **Read-only in the database.** The demo account is marked as a demo, and `can_write()` returns false for it, so every write the board has (post, reply, join, leave, RSVP, report, claim, message, profile edit, account deletion) is refused by the database whatever the page shows. Buttons explain that the demo can look but not change anything. | Should | A pgTAP test tries every write as the demo account and every one is refused. |
| FR-AC-16 | **Demo groups only.** The demo account is a member only of groups marked as demo groups, whose content is sample content, so it never reads a real group's members-only discussions or member list. Demo groups are listed like any other but carry a *Demo* tag. | Should | The demo account belongs to no real group; every demo group is tagged. |
