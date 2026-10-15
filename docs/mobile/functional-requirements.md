---
sidebar_position: 4
title: Functional requirements
---

# Mobile functional requirements

> **Draft** (14 October 2026), written ahead of review because Sarah asked
> for the mobile requirements in their own folder. They follow the
> [mobile use cases](./use-cases) and change if those change. Nothing is
> built until Sarah says go.

Every requirement is for **the tool**: a board's activities, areas, names
and colors come from its own settings. *Also web* marks a requirement that
changes the web board too; it moves into the main
[functional requirements](../functional-requirements) when built.

Priority follows the PRD: **Must** for the first release of the app,
**Should** next, **Could** is cut without discussion.

Every requirement inherits the board's rules: permissions live in the
database (RLS), the anonymous role never writes, every input is checked
with Zod on the server, user content is shown as text, and the same
filters give everyone the same list (P2).

## Navigation (FR-MO-NAV)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-NAV-1 | **Tab bar** at the bottom on every list screen: *Events*, *My week*, *Groups*, *Inbox*, *Me*, each an icon with its name. The current tab is marked by shape and color, not color alone. Full-screen pages (an event, a conversation, a form) hide it and show a back arrow. | Must | Every list screen is reachable in one tap from any other. |
| FR-MO-NAV-2 | **Top bar** names the area and town (*Hendersonville · Western Carolinas*); tapping it opens the area tray (FR-MO-LOC-5). It shrinks to one line as the list scrolls and grows back on scrolling up. A search button opens search. | Must | The area being shown is always visible or one scroll away. |
| FR-MO-NAV-3 | **Inbox count.** The *Inbox* tab shows a plain number: unread conversations plus, for organizers, open requests and reports for their groups. No other tab has a count. (D2) | Must | The number equals the items shown in Inbox. |
| FR-MO-NAV-4 | **Signed out.** *Events* and *Groups* work fully. *My week*, *Inbox* and *Me* show one line on what they hold and *Sign in* / *Create an account*. | Must | No list screen is a blank wall. |
| FR-MO-NAV-5 | **Back keeps the place.** Going back returns to the same scroll position, filters and folded days. | Must | Opening and closing an event never resets the list. |
| FR-MO-NAV-6 | **Shared links open the right screen.** A board link (`/e/…`, `/g/…`, `/events?…`) opens that screen in the app when installed, with the same filters. | Should | A link copied from the web opens the same view in the app. |

## Location (FR-MO-LOC)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-LOC-1 | **First question.** On first open the app asks *Where do you live?*: a zip code, or a town and state. Nothing else is asked first, and the device's location is never requested. | Must | The app works fully without location permission. |
| FR-MO-LOC-2 | **Match to areas.** The zip or town is matched against the board's town and zip lists (`src/config/towns.ts`, `zips.ts`), then to every live area whose radius covers it, nearest hub first, each with hub towns, distance and counts of groups and upcoming events. | Must | A zip inside two areas' radii lists both. |
| FR-MO-LOC-3 | **No area yet.** A town in no area (UC-41) shows *Your town isn't in an area yet* and uses *everything within 50 miles of your town*, including ungrouped listings. | Must | A user in Austin sees Austin's ungrouped communities. |
| FR-MO-LOC-4 | **Unknown place.** A zip or town not in the lists says so and suggests typing a nearby town; nothing is guessed. | Must | An unknown zip never silently picks an area. |
| FR-MO-LOC-5 | **Change later.** The area tray lists the person's area first, then the big regions (ADR-0012) folded, each opening to its areas. Changing the town keeps the area unless the new town is outside it. | Must | Changing area takes at most three taps. |
| FR-MO-LOC-6 | **Where it's kept.** Signed out: on the phone only. Signed in: the town becomes the profile's home town (FR-PR-2) and its area the default (FR-RG-2), as on the web. | Must | Nothing is stored on the server for a signed-out person. |
| FR-MO-LOC-7 | **Distance from home.** Distances on cards are from the chosen town, rounded (*4 mi*, *about 30 mi* when the zip match is approximate, FR-RG). | Should | An approximate match is labelled *about*. |

## What I do and want to try (FR-MO-INT) — also web

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-INT-1 | **Offered once.** After the location step, *Tell us what you do and what you'd like to try*, with *Skip*. Reopened only from *Me → What I do*. | Must | Skipping never brings it back on its own. |
| FR-MO-INT-2 | **Per activity:** *I do this* or *I want to try this* (or neither), from the board's activity categories. | Must | Only real categories can be stored. |
| FR-MO-INT-3 | **Level** for *I do this*: *New to it*, *Getting comfortable*, *Experienced*. *I want to try this* has no level. | Should | A want-to-try row can't carry a level (database check). |
| FR-MO-INT-4 | **Stored with the profile.** `profile_activities` gains `stance` (`do`, `want_to_try`) and `level` (nullable). The profile's *activities* section shows *Hiking (getting comfortable)* and *Wants to try: climbing*, under the existing Show/Hide (FR-PR-7) and who-sees rules (FR-PR-8). | Should | A hidden activities section is unreadable through the API, levels included (new pgTAP test). |
| FR-MO-INT-5 | **Signed out.** Choices stay on the phone; on sign-up the person is asked once whether to add them to their profile. | Should | Nothing is sent before they agree. |
| FR-MO-INT-6 | **Used only as filters.** The choices drive the *My activities* and *Try something new* chips (FR-MO-FND-3, FR-MO-TRY-1) and nothing else: no ranking, no messages, nothing shown to organizers beyond the profile they may already see. | Must | Two people with the same choices and filters see the same list. |

## Finding events (FR-MO-FND)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-FND-1 | **When.** A segmented control at the top of *Events*: *This weekend* (Friday 5 pm to Sunday night, in the area's time zone), *This week* (today to Sunday), *Coming up* (next 30 days). The default is *This weekend* from Thursday to Sunday, *This week* otherwise. A *Pick dates* option in the filter tray covers anything else. | Must | Each window matches the same window on the web Events page. |
| FR-MO-FND-2 | **Activity chips.** One horizontally scrolling row: *Everything*, *My activities*, *Try something new*, then each activity with its drawing. One chip is chosen at a time; choosing an activity opens a second row of its subcategories. | Must | The chosen chip is visible without scrolling the row. |
| FR-MO-FND-3 | **My activities** shows events in the person's *I do this* activities; when they set none, it opens the MUC-2 tray instead. | Must | — |
| FR-MO-FND-4 | **Summary line.** Above the list, always: count, when, activity, distance, sort (*14 events · this weekend · Paddling · within 25 mi · soonest first*). Each active filter is also a removable chip under it. | Must | The line updates with every change and matches the list. |
| FR-MO-FND-5 | **Filters tray**: *Distance* (10, 25, 50, 100 miles, any), *Time of day* (morning, afternoon, evening), *Days* (weekdays, weekends), *Level* (FR-MO-EVL-1), *Cost* (free only), *Hosts* (community groups only, UC-37), *Spots* (has room). The tray's button shows the live count, *Show 5 events*; *Clear all* resets. | Must | The count on the button equals the list it opens. |
| FR-MO-FND-6 | **Sort tray**: *Soonest first* (default) or *Nearest first*. No other sort, and never *popular*. | Must | — |
| FR-MO-FND-7 | **Days.** The list groups events by day; the day heading stays pinned while its events scroll and folds closed on tap; a folded day shows its count (*Sunday 18 Oct · 6 events*). | Must | Folding survives going back (FR-MO-NAV-5). |
| FR-MO-FND-8 | **Event card**: time, title, host (marked *guide*, *shop* or *venue* when not a community group), activity drawing, place and distance, level tag, *Free* or the fee, *6 spots left* or *Full · waitlist*, *Going* or *Saved* if so, and a *Save* button. No photo on list cards (P5). | Must | Every card has the same layout. |
| FR-MO-FND-9 | **Long lists.** The first 30 events load; a *Show 30 more* button at the bottom loads the next 30. Nothing loads on its own as the person scrolls (P6 rules out infinite scroll), and the list ends where the time window ends. *Coming up* adds a *Jump to date* button. | Must | The list always ends, with *That's everything in the next 30 days*. |
| FR-MO-FND-10 | **Empty results** say why and offer the two widenings that would add the most (*Widen to 50 miles*, *Show this week*), each with its count. | Must | No empty screen without a next step. |
| FR-MO-FND-11 | **Event screen**: full screen, facts first (when, where, host, level, cost, spots), then description, details, FAQ, sponsors, who's going (as permitted), and a bottom bar with *Going* / *Ask to go* / *Join waitlist* and *Save*, plus *Add to my calendar* and *Share*. | Must | Same permissions as the web event page. |
| FR-MO-FND-12 | **Search** from the top bar: groups and events in the area by keyword, results in two sections. | Should | Same results as the web search for the same area. |

## Event level (FR-MO-EVL) — also web

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-EVL-1 | **Level** on events, optional: `intro` (*Intro: first-timers welcome*), `all_levels`, `some_experience`, `experienced`. New column `events.level`, null when not set. | Must (for MUC-4) | Only the four values or null can be stored. |
| FR-MO-EVL-2 | **Set by organizers** on the event form (web and app) and by the site admin for listed events from research and event sources (FR-ES); the source reader may suggest it from the source's own words, never set it unreviewed. | Must | A member can't change an event's level (RLS: same as editing the event). |
| FR-MO-EVL-3 | **Shown** as a tag on event cards and the event page, web and app, with the words, not only a color. | Must | — |

## Try something new (FR-MO-TRY)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-TRY-1 | **The chip** shows events in the person's *want to try* activities that are `intro` or in a *Beginners welcome* group, in the chosen window (default *next 30 days* for this chip) and distance, soonest first. | Must | Same settings, same list, for anyone. |
| FR-MO-TRY-2 | **The summary line names it** (*Intro events · Climbing · within 25 mi · next 30 days*). | Must | — |
| FR-MO-TRY-3 | **No want-to-try set** opens the MUC-2 tray, starting on *I want to try this*. | Must | — |
| FR-MO-TRY-4 | **Groups that welcome beginners**: below the events, the area's groups in those activities that list under *Beginners welcome* or have an upcoming intro event, A to Z. | Should | Sorted A to Z, never by size or activity. |
| FR-MO-TRY-5 | **None found** offers *Widen to 50 miles*, *Look 90 days ahead* and *See groups in Climbing*, each with its count. | Must | — |
| FR-MO-TRY-6 | **Experienced levels.** A person who marks an activity *Experienced* may pick *Some experience* and *Experienced* in the Level filter; nothing is hidden from anyone because of their level. | Should | Levels never remove events from *Everything*. |

## My week (FR-MO-CAL)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-CAL-1 | **Week strip**: seven days from today, each with up to three dots for the person's going, saved and asked-to-go events; swiping or *Previous* / *Next* moves a week; *Today* returns. | Must | Dots match the list below. |
| FR-MO-CAL-2 | **Day list** below the strip: each day's events in start order with *Going*, *Saved*, *Asked to go* or *Waitlist*, cancelled ones struck through and marked. | Must | Same data as FR-AC-9. |
| FR-MO-CAL-3 | **Filter tray** as FR-AC-9: going and saved, going only, saved only, everything in my groups, one group. | Must | — |
| FR-MO-CAL-4 | **Change an RSVP** from the event screen; the change shows in My week at once. | Must | — |
| FR-MO-CAL-5 | **Add to my calendar** per event (the existing .ics), and **subscribe** to a private feed of the person's going events (a secret link they can turn off and replace). | Should (subscribe) | A replaced feed link stops working. |
| FR-MO-CAL-6 | **Month view** as a switch in the filter tray. | Could | — |

## Groups (FR-MO-GRP)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-GRP-1 | **Groups tab**: *Mine* first (A to Z, each with its next event and newest thread), then *In this area*, A to Z, with activity chips and a letter index along the edge for jumping. | Must | The letter index works with a screen reader as a list of links. |
| FR-MO-GRP-2 | **Group screen**: name, type, area, member count, *Join* / *Ask to join*, then tabs *Events*, *Discussions*, *Photos*, *About*. | Must | Same permissions as the web group page. |
| FR-MO-GRP-3 | **Thread screen**: posts top to bottom with one level of replies (FR-DS-9); the reply box is pinned at the bottom and grows with the text; *Reply* on a post quotes its author's name. | Must | Locked threads show no reply box. |
| FR-MO-GRP-4 | **New thread** from the Discussions tab: title and text. | Must | — |
| FR-MO-GRP-5 | **Creating or editing a group** links to the web page for it. | Must | — |

## Messages (FR-MO-MSG)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-MSG-1 | **Inbox** has sections: *Needs you* (organizers only, FR-MO-ORG-1), *Messages*, *Requests*; each folds. | Must | — |
| FR-MO-MSG-2 | **Conversation**: oldest at top, newest at the bottom, the reply box pinned above the keyboard, sending shows the message at once and marks it *Not sent · Try again* if it fails. | Must | A failed send is never lost silently. |
| FR-MO-MSG-3 | **New messages arrive** when the conversation is open or refreshed (pull down, or reopening the app); no typing indicators, no read receipts (ADR-0006). | Must | — |
| FR-MO-MSG-4 | **Requests**: the sender's profile card (as permitted, FR-PR-8) and first message, with *Accept*, *Decline*, *Block and report*. | Must | — |
| FR-MO-MSG-5 | **Start a message** from a person's profile, as on the web (UC-20 rules). | Should | — |
| FR-MO-MSG-6 | **Nothing outside the app.** No push, no lock-screen preview, unless D2 is decided otherwise. | Must | — |

## Organizers (FR-MO-ORG)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-ORG-1 | **Needs you**: join requests, RSVP requests, message requests to the group, reports and claims for groups the person runs, grouped by kind, each with its group and age. Shown only to page admins and page managers. | Must | Shows nothing for groups the person doesn't run (RLS). |
| FR-MO-ORG-2 | **Request cards** with *Approve* and *Decline* always visible; swiping right approves, left declines, with *Undo* for 5 seconds. | Must | Every action works without swiping. |
| FR-MO-ORG-3 | **Run this group**: the next event's going count and spots, *Manage RSVPs*, *Post an update*, *Post an event*, *Members*, *Invite link*, *Edit on the web*. | Must | Only page admins and page managers see it. |
| FR-MO-ORG-4 | **Manage RSVPs**: tabs *Going*, *Asked*, *Waitlist*, *Not going*; approve, decline, move from waitlist; counts on each tab. | Must | Same checks as UC-17. |
| FR-MO-ORG-5 | **Post an update**: a thread, pinned if chosen, in a group with discussions on. | Must | — |
| FR-MO-ORG-6 | **Members**: search, A to Z, role labels; *Make page manager*, *Remove*, *Ban* with a confirmation step. | Should | A page manager can't change the page admin. |
| FR-MO-ORG-7 | **Reports**: the reported item in context, *Remove* or *Keep*, logged as on the web. | Must | Logged in the moderation log. |
| FR-MO-ORG-8 | **Invite link**: copy or share the group's invite link (UC-31). | Should | — |
| FR-MO-ORG-9 | **Cancel an event** from the event screen, with a reason shown to members. | Must | Same rules as FR-EV. |

## Posting an event (FR-MO-PST)

| ID | Requirement | Priority | Accepted when |
| --- | --- | --- | --- |
| FR-MO-PST-1 | **Copy or blank.** *Copy a past event* lists the group's last five events; copying fills every field except date and RSVPs. | Must | — |
| FR-MO-PST-2 | **Folding sections**: *What*, *When*, *Where*, *Who can come*, *Cost*; a folded section shows a one-line summary. | Must | The whole event is checkable on one screen. |
| FR-MO-PST-3 | **Native pickers** for date and time, in the event's time zone, named when it differs from the phone's. | Must | — |
| FR-MO-PST-4 | **Same checks as the web** (FR-EV-1 to FR-EV-28, Zod on the server). A failed check opens its section with the message beside the field. | Must | — |
| FR-MO-PST-5 | **Photo** from the phone's photo library, re-encoded and stripped as on the web (TR-SEC-9). | Should | — |
| FR-MO-PST-6 | **Draft kept** on the phone if the app closes before posting. | Should | — |
