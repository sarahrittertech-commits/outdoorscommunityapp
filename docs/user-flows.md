---
sidebar_position: 4.5
title: User flows
---

# User flows

One diagram per [use case](./use-cases): the screens a person moves
through on the main path, and the decisions where the path could split.
Rectangles are screens, diamonds are decisions, and rounded boxes are
where the flow ends. A split is shown only where it changes which screen
comes next; the full list of alternative paths and edge cases lives in the
[functional requirements](./functional-requirements).

The diagrams are [Mermaid](https://mermaid.js.org/), which GitHub renders
in place.

## UC-1 — What's out there?

```mermaid
flowchart TD
  home["Home<br/>search · activity drawings · coming up"] -->|clicks Hiking drawing| cat["Category: Hiking & Backpacking<br/>groups A–Z"]
  cat -->|picks Day hikes| sub["Subcategory: Day hikes<br/>groups A–Z"]
  sub -->|opens a group| group["Group page<br/>about · organizers · upcoming events"]
  group -->|opens next event| event["Event page<br/>when · where · host"]
  event --> done([Knows what's on, never asked to sign in])
  home -.->|or: types in search| search["Search results"] -.-> group
```

## UC-2 — Join and show up

```mermaid
flowchart TD
  group["Group page"] -->|Join group| signed{Signed in?}
  signed -->|no| signin["Sign in<br/>enter email"] --> email["Email link"] --> welcome["Welcome<br/>18+, terms, display name"] --> group2
  signed -->|yes| policy
  group2["Back on the group page"] --> policy{Join policy}
  policy -->|open| member["Group page: you're a member"]
  policy -->|approval| pending(["Request sent; waits for an organizer"])
  member -->|opens next event| event["Event page"] -->|I'm going| going([Going; shows in My stuff])
```

## UC-3 — Start a group

```mermaid
flowchart TD
  post["+ post"] --> choose["Post page<br/>an event · a group"]
  choose -->|Start a group| form["New group form<br/>name, description, activity, area, join policy"]
  form -->|Create| group["New group page<br/>you're the owner"]
  group -->|post an event| eform["New event form<br/>date, time, meeting point"]
  eform -->|Post| event["Event page"] --> done([Group and event live; link shared])
```

## UC-4 — Share the work

```mermaid
flowchart TD
  group["Group page (owner)"] -->|members| members["Members page"]
  members -->|make admin| members2["Members page: now an admin"]
  members2 --> admin["New admin opens Members page"]
  admin -->|approves 2 requests| admin2["Members page: requests cleared"]
  admin2 -->|post an event| eform["New event form"] --> done([Event posted by the new admin])
```

## UC-5 — Sort out the carpool

```mermaid
flowchart TD
  me["My stuff<br/>upcoming RSVPs"] -->|opens Saturday's group| group["Group page"]
  group -->|discussion board| board["Discussion board"]
  board -->|new thread| tform["New thread form"]
  tform -->|Post| thread["Thread page"]
  thread -->|replies arrive| board2["Board: thread moves to top"] --> done([Carpool sorted, members only])
```

## UC-6 — Something's wrong

```mermaid
flowchart TD
  thread["Thread page (regular)"] -->|Report on a reply| report["Report form<br/>reason, note"]
  report -->|Send| thanks["Thread page: thanks notice"]
  thanks --> queue["Group reports page (admin)"]
  queue -->|remove reply| removed["Reply reads 'removed by a moderator'"]
  removed -->|remove and ban| members["Members page: banned"]
  members --> site["Site admin page"]
  site -->|suspend account| done([Account suspended across the board])
```

## UC-7 — Something to do this weekend

```mermaid
flowchart TD
  events["Events<br/>next 30 days, by month"] -->|next 7 days| week["Events: next 7 days"]
  week -->|picks an activity| filtered["Events: next 7 days, one activity"]
  filtered -->|opens an event| event["Event page"]
  event --> listed{Unclaimed listing?}
  listed -->|no| cal["Add to calendar"] --> done([Plans made, no sign-in])
  listed -->|yes| out(["Follows the link to the organizer's own page"])
```

## UC-8 — This is my club

```mermaid
flowchart TD
  group["Group page<br/>'Unclaimed listing' banner"] --> signed{Signed in?}
  signed -->|no| signin["Sign in → Welcome"] --> group2["Group page with claim form"]
  signed -->|yes| group2
  group2 -->|writes note, Ask to claim| sent["Group page: claim waiting for review"]
  sent --> admin["Site admin page<br/>claim requests"]
  admin --> check{Note checks out against the club's page?}
  check -->|yes, Approve| owner["Group page: you're the owner<br/>organizer tools, discussion board"]
  check -->|no, Decline| declined(["Group page: claim wasn't approved"])
  owner --> done([Club runs its own group on the board])
```

## UC-9 — Keep the listings fresh

*Approved 8 October 2026.*

```mermaid
flowchart TD
  sched(["Weekly schedule"]) --> agent["Research agent<br/>searches the web per activity and area"]
  agent --> known{Already in the research area?}
  known -->|yes| skip1([Skipped])
  known -->|no| cand["Saved as a candidate<br/>type · activity · area · source link · events"]
  cand --> admin["Site admin page: Candidates<br/>this week's finds, by type"]
  admin --> kind{Community group?}
  kind -->|no: guide, business, venue| keep(["Stays in the research area"])
  kind -->|yes| check{Source page checks out?}
  check -->|no, Skip| skip2(["Marked skipped; not suggested again"])
  check -->|yes, List it| listed["Group page: unclaimed listing<br/>with its upcoming events"]
  listed --> done(["Visible on the board; organizer can claim it (UC-8)"])
```

## UC-10 — Post a ride series

*Approved and built 9 October 2026 for single events: sponsors (on the event's Sponsors page), FAQ and RSVPs open at. The series steps stay a draft, awaiting review.*

```mermaid
flowchart TD
  group["Group page (admin)"] -->|post an event| form["New event form<br/>title · details · start and end dates and times · place · places"]
  form --> repeat{Repeats?}
  repeat -->|no| extras
  repeat -->|weekly on Thursdays until 17 Dec| extras["Picture · sponsors · FAQ"]
  extras -->|Publish| page["Event page<br/>picture · dates · details · Sponsored by logos · FAQ · RSVP · places left"]
  page --> series["Series: one event per Thursday"]
  series -->|admin edits series| edited(["Every date still to come is updated"])
```

## UC-11 — Ask before you go

*Draft, awaiting review.*

```mermaid
flowchart TD
  event["Event page<br/>FAQ"] --> found{Answer in the FAQ?}
  found -->|yes| rsvp(["RSVPs"])
  found -->|no| signed{Signed in?}
  signed -->|no| signin["Sign in → Welcome"] --> ask
  signed -->|yes| ask["Ask a question form"]
  ask -->|Send| waiting["Event page: question waiting"]
  waiting --> admin["Group admin answers on the event page"]
  admin -->|Add to the FAQ| faq["Event page: answer in the FAQ"]
  faq --> rsvp
```

## UC-12 — A bike shop on the board

*Draft, awaiting review.*

```mermaid
flowchart TD
  signin["Sign in with the business email"] --> listed["Business page<br/>unclaimed listing"]
  listed -->|claim, site admin checks email against website| owner["Business page: you're the owner"]
  owner -->|edit| form["Business form<br/>services · activities · locations · places it operates"]
  owner -->|Admins| admins["Add staff by their own accounts"]
  owner -->|Start a group, link it| group["Business's group<br/>its own owner and admins"]
  group -->|Post an event| event["Event hosted by the group<br/>at one of the shops"]
  form --> page["Business page<br/>offers · locations · places · group and its events · events it sponsors"]
  event --> page
  sponsor["Another group's event (UC-10)"] -->|admin adds sponsor| sponsored["Event page: Sponsored by logos<br/>below the details"]
  sponsored --> page
  page --> done(["Found by people looking for rentals, repairs or guides near a place"])
```

## UC-13 — A local chapter of a national club

*Draft, awaiting review.*

```mermaid
flowchart TD
  chapter["Chapter's group page"] -->|edit group: part of| national["National organization page<br/>American Alpine Club · its chapters"]
  visitor(["Visitor who knows the national club"]) --> national
  national -->|picks the nearby chapter| chapter
  chapter --> events(["Chapter's events, RSVP as usual"])
```

## UC-14 — What's near me?

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Home<br/>Activity · Location · Distance"] -->|Hendersonville, 25 miles| results["Results<br/>events soonest first · groups A–Z · distance on each"]
  results -->|Events page, same filters| events["Events: filtered list"]
  events -->|copies the link| shared(["Friend opens the same filtered list"])
  home --> near["Near you row<br/>next events near the chosen town"]
  near -->|Change| town["Pick another town or zip"] --> near
```

## UC-15 — Explore destinations

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Home: Explore destinations<br/>map and list"] -->|Climbing| filtered["Map and list: climbing places"]
  filtered -->|searches Brevard| moved["Map centred on Brevard"]
  moved -->|opens Looking Glass Rock| place["Place page<br/>description · groups that meet there · upcoming events"]
  place --> event(["Opens an event or a group"])
```

## UC-16 — Keep our member list private

*Approved and built 9 October 2026. Set by the page admin or a page manager.*

```mermaid
flowchart TD
  settings["Group settings (owner)"] --> choice{Who can see the member list?}
  choice -->|Organizers only| saved["Settings saved"]
  choice -->|Members · default| saved
  choice -->|Anyone signed in| saved
  saved --> members["Members tab: shows what the setting allows"]
  saved --> event(["Event page: who's going shows a count, names only if allowed"])
```

## UC-17 — Approve who comes

*Approved and built 9 October 2026. Manage RSVPs is at /e/<id>/rsvps, linked from the page admin tools.*

```mermaid
flowchart TD
  form["New event form<br/>Approve RSVPs on · 12 places"] -->|Publish| event["Event page: Ask to come"]
  event -->|members ask| manage["Manage RSVPs<br/>requests · going · waitlist · declined"]
  manage -->|approve| going["Going"]
  manage -->|decline| declined["Declined"]
  manage -->|waitlist| waitlist["Waitlist"]
  going -->|someone cancels| opening{Place opens}
  opening -->|admin moves them| fromwait(["Waitlisted rider is going"])
```

## UC-18 — My calendar

*Approved and built 9 October 2026. Every choice (view, date, filters) is
a link or a GET form in the page address (`/?cal=week&date=2026-10-09&show=going#calendar`),
so it works without JavaScript. With no view chosen, the screen width
decides: month on a computer, week on a phone.*

```mermaid
flowchart TD
  home["Signed-in home: calendar<br/>month on computer · week on phone"] -->|Week / Month| home
  home -->|filter: one group, going only| filtered["Calendar: filtered"]
  filtered -->|opens Thursday's ride| event["Event page"]
  event -->|Add to calendar| ics(["Calendar file downloaded"])
```

## UC-19 — Reply to a reply

*Approved and built 9 October 2026. The* reply *link opens the form under
that reply (`?replyTo=<id>#reply-form`), so it works without JavaScript.*

```mermaid
flowchart TD
  thread["Thread page"] -->|reply under a reply| form["Reply form, naming who it answers"]
  form -->|Post| nested["Reply shown indented under the one it answers"]
  nested --> deeper{Reply to that reply?}
  deeper -->|yes| same(["Shown at the same indent: one level only"])
```

## UC-20 — Message another member

*Approved and built 9 October 2026.*

```mermaid
flowchart TD
  profile["Member's profile"] -->|Message| first["New message form"]
  first -->|Send| request["Their inbox: Requests"]
  request --> decide{Accept?}
  decide -->|Accept| inbox["Conversation in both inboxes<br/>unread count in header"]
  decide -->|Decline| declined(["Sender can't message again<br/>and sees only 'waiting'"])
  decide -->|Block| blocked(["Blocked; unblock from Messages"])
  inbox -->|replies, page by page| inbox
  inbox -->|report a message| report(["Site admin only; can read that conversation"])
```

## UC-21 — Share trip photos

*Approved and built 9 October 2026.* The Photos page is linked from the
group page; each photo needs a description. A non-member sees "The photos
are for members" unless the page admin made the gallery public.

```mermaid
flowchart TD
  group["Group page: Photos"] --> photos["Photos page<br/>thumbnails, newest first"]
  photos -->|Add photos| upload["Up to 10 photos, a description for each"]
  upload -->|Add photos| photos
  photos -->|open one| full["Photo full size<br/>who added it, when"]
  full -->|uploader deletes| removed(["Gone from the gallery"])
  full -->|organizer removes| modded(["Removed, logged as moderation"])
  full -->|Report this photo| report(["Report to the group's organizers"])
```

## UC-22 — Save it for later

*Approved and built 9 October 2026. The reminder step waits on UC-10 and UC-23.*

```mermaid
flowchart TD
  event["Event page<br/>RSVPs open Tue 14 Oct, 9:00 am"] -->|Save| saved["My stuff: Saved"]
  saved --> opens{RSVPs open}
  opens --> reminder["Reminders: RSVPs are open"]
  reminder -->|opens event| rsvp(["RSVPs, or unsaves"])
```

## UC-24 — Tell groups apart

*Approved and built 9 October 2026.* The photo is uploaded in group
settings (no gallery yet, UC-21); a group without one shows no photo, or a
sample group's representative photo.

```mermaid
flowchart TD
  list["Communities<br/>photo · type icon and label · activity icons"] -->|filter: Volunteer group| filtered["Communities: volunteer groups"]
  filtered -->|opens one| group["Group page<br/>photo · type · area · members"]
  owner["Group settings (page admin or manager)<br/>type · cover photo and its description"] -->|saves| group
  group --> done(["Knows what kind of group it is"])
```

## UC-23 — What needs my attention

*Draft, awaiting review.*

```mermaid
flowchart TD
  home["Signed-in home: Reminders<br/>join and RSVP requests · tomorrow · nearly full · RSVPs open · new thread · new message"] -->|opens an item| item["The page that needs them"]
  item -->|handled| home
  home --> mine["My communities<br/>next event · latest thread · manage links"]
  mine --> done(["Nothing left needing them"])
```

## UC-25 — A sign-in email that sounds like us

*Draft, awaiting review. Needs the domain and Resend before it can ship.*

```mermaid
flowchart TD
  signin["Sign in<br/>enter email"] -->|Send me a link| check["Check your email"]
  check --> first{First sign-in?}
  first -->|yes| welcomeMail["Email from Branch Outdoors<br/>welcome line · link · works for 1 hour · ignore if not you"]
  first -->|no| signinMail["Email from Branch Outdoors<br/>link · works for 1 hour · ignore if not you"]
  welcomeMail -->|clicks link| welcome["Welcome<br/>18+, terms, display name"]
  signinMail -->|clicks link| back(["Back on the page they started from"])
  welcome --> back
```

## UC-26 — Prove it's my club

*Draft, awaiting review. Needs the domain and Resend before it can ship.*

```mermaid
flowchart TD
  claim["Group page: claim form<br/>note · optional club email"] --> email{Club email given?}
  email -->|no| waiting["Group page: claim waiting for review"]
  email -->|yes, at the website's domain| sent["Group page: link sent to that address<br/>claim waiting for review"]
  sent -->|clicks link in time| confirmed["Confirmed at brevardpaddlers.org"]
  sent -.->|never clicks, or link expires| waiting
  confirmed --> admin["Site admin page: claim requests<br/>'Confirmed at …' or 'Not confirmed'"]
  waiting --> admin
  admin --> decide{Note and confirmation check out?}
  decide -->|yes, Approve| owner(["Group page: you're the owner"])
  decide -->|no, Decline| declined(["Group page: claim wasn't approved"])
```

## UC-27 — Start your first group

*Approved (option B) and built 9 October 2026: approve only a person's
first group. A declined group's page admin can delete it and start again.*

```mermaid
flowchart TD
  start["Start a group form<br/>'first groups are checked before listing'"] -->|Create| first{Already has an approved group?}
  first -->|yes| listed["Group page: listed, open to join"]
  first -->|no| pending["Group page: Waiting for review<br/>visible to them and the site admin"]
  pending --> admin["Site admin page: New groups"]
  admin --> decide{Real outdoor group?}
  decide -->|yes, Approve| listed
  decide -->|no, Decline with a reason| declined(["Group page: not approved, with the reason"])
  listed -->|posts first event| done(["Group is live"])
```

## UC-28 — Look around as a member

*Draft, awaiting review. Decision needed: drawn for the read-only demo
member on the live board.*

```mermaid
flowchart TD
  signin["Sign-in page"] -->|Look around as a demo member| demo["Signed in as Demo member<br/>band: nothing you do here is saved"]
  demo --> browse["Demo groups: discussions, members,<br/>who's going, My stuff"]
  browse --> act{Tries to RSVP, post, join or report?}
  act -->|yes| refuse["Button explains: the demo can look, not change<br/>link: sign in for real"]
  act -->|no| browse
  refuse --> browse
  browse -->|Sign out, or one hour passes| out(["Signed out"])
```

## UC-29 — Sign up with an email and a password

*Approved and built 9 October 2026. Open sign-up with email confirmation; password only.
Emailed links open a page with a Continue button, so they work in any browser or mail
app and a mail scanner can't use them up (10 October).*

```mermaid
flowchart TD
  join["Group page: Join group"] --> signin["Sign in<br/>email + password<br/>links: Create an account · Forgot password"]
  signin -->|Create an account| signup["Create an account<br/>email only"]
  signup -->|Email me the link| check(["Check your email"])
  check -->|clicks Confirm my email| cont1["Confirm your email: Continue"]
  cont1 --> create["Create your password<br/>password, password again"]
  create --> welcome["Welcome: 18+, terms, display name"]
  welcome --> back["Back on the group page: Join"]
  signin -->|correct email + password| back
  signin -->|wrong, or email not confirmed| signin
  signin -->|Forgot password| forgot["Forgot password: email"]
  forgot --> resetmail(["Check your email for a reset link"])
  resetmail -->|clicks the link| cont2["Reset your password: Continue"]
  cont2 --> newpw["Set a new password"]
  newpw --> back
```

## UC-30 — Post an event people want to come to

*Approved and built 9 October 2026.*

```mermaid
flowchart TD
  start["Group page: Post an event"] --> form["Event form<br/>title, dates, place<br/>Description (required), Details (optional)<br/>Photo + its description (optional)"]
  form --> price{Free or Paid?}
  price -->|Free| rsvp{Take RSVPs on Branch Outdoors?}
  price -->|Paid| cost["Registration fee, Total cost (text)"] --> rsvp
  rsvp -->|yes| places["Places (optional)<br/>Waitlist when full (tick)"] --> publish
  rsvp -->|no| link["Sign-up link (optional)"] --> publish
  publish["Publish"] --> page(["Event page: photo, description, price, details,<br/>RSVP buttons and places left, or Sign up at …"])
  page -->|full, waitlist on| wait["Members join the waitlist in order"]
  wait -->|someone drops out| move(["Organizer moves the next person to going"])
```

## UC-31 — Bring people into the group

*Approved and built 9 October 2026. Email invites wait on the board's email
setup; the forms show disabled until then. The invite page (/join/<code>)
names the group, creates the account and joins in one place; joining is
always a button press, so link previews never join anyone.*

```mermaid
flowchart TD
  members["Members page (page admin)"] --> mgr["Page managers: pick a member, or enter an email"]
  mgr --> cap{Already two managers?}
  cap -->|yes| full(["Remove one first"])
  cap -->|no, a member| made(["They are a page manager"])
  cap -->|no, an email| mgrmail["Manager invite email"] --> accept["They sign up or sign in and accept"] --> made
  members --> invite["Invite people: 1 to 25 emails"] --> sent(["One email per address with a join link"])
  members --> link["Invite link: Create, copy, turn off"]
  sent --> open
  link --> open["Someone opens the link"]
  open --> valid{Link working?}
  valid -->|no: off, expired or made up| refuse(["This invite link isn't working. Ask the group for a new one"])
  valid -->|yes| signed{Signed in?}
  signed -->|no| landing["Group name is on Branch Outdoors<br/>Create your account and join: email, then the link to create a password<br/>or Sign in"]
  landing -->|creates account| check(["Check your email: the link brings you back to join"])
  check -->|confirms email| onboard
  landing -->|signs in| onboard{Finished the welcome step?}
  signed -->|yes| onboard
  onboard -->|no| welcome["Welcome: display name, 18+, terms"] --> invites
  onboard -->|yes| invites{Already a member?}
  invites -->|yes| grouppage(["Group page"])
  invites -->|no| joinbtn["Group name invites you: Join button"] --> join{Banned?}
  join -->|no| member(["Group page: Welcome to the group, no approval needed"])
  join -->|yes| refuse2(["You can't join this group"])
```

## UC-32 — Suggest something to the site admin

*Approved and built 9 October 2026. The form is at /suggest, linked from
the footer and My stuff; the site admin's list is on the admin page.*

```mermaid
flowchart TD
  entry["Footer or My stuff: Suggest something"] --> signed{Signed in?}
  signed -->|no| signin["Sign in"] --> form
  signed -->|yes| form["Suggestion form<br/>kind: region, feature, group, event, other<br/>title, details, optional link"]
  form -->|Send| thanks(["Thanks: listed under My suggestions as New"])
  thanks --> admin["Admin page: Suggestions, newest first, by kind"]
  admin --> decide{Site admin decides}
  decide --> planned(["Planned"])
  decide --> done(["Done"])
  decide --> declined(["Declined"])
  planned & done & declined --> back(["Member sees the status and note under My suggestions"])
```

## UC-33 — Tell people about yourself

*Approved and built 10 October 2026, with Sarah's visibility model: the
member and the site admin; everyone, for page admins and page managers of a
listed group; organizers of the member's groups (and of groups they asked
to join); co-members, if the member opts in; nobody else.*

```mermaid
flowchart TD
  me["My stuff → Profile"] --> edit["Profile settings<br/>every section optional"]
  edit --> photo["Photo (optional): upload, 320px square,<br/>one-line description"]
  edit --> basics["Home town (town list), blurb (280)"]
  edit --> acts["Activities I enjoy: tick from the activity list"]
  edit --> blanks["Fill in up to 3 of 8 prompts<br/>I've always wanted to try ___"]
  edit --> goals["This year's adventure goals: up to 10,<br/>tick when done"]
  photo & basics & acts & blanks & goals --> vis["Each section: Show or Hide<br/>Share with members of my groups? (off)"]
  vis --> save["Save"] --> preview(["Open my profile: hidden sections marked"])
  reader["Someone opens a name<br/>(post, RSVP list, join request, message request)"] --> who{Who is reading?}
  who -->|the member or the site admin| profile
  who -->|anyone, and the member is a page admin<br/>or page manager of a listed group| profile
  who -->|an organizer of a group the member<br/>is in or asked to join| profile
  who -->|a co-member, and the member shares<br/>with members of their groups| profile
  who -->|anyone else| nameonly(["Display name only:<br/>Sign in to see more (signed out, if it could help)<br/>or This profile is private"])
  profile(["Profile: photo with blurb, town and activities beside it;<br/>fill-in-the-blanks; this year's goals with ticks;<br/>groups, linked (only those whose member list the reader may see);<br/>hidden sections left out"])
  profile --> report["Report this profile"]
  nameonly --> report
```

**Layout (wide screens):**

```
+---------------------------------------------------------------+
| [photo]   Sam Rivers                                          |
| 120x120   Brevard, NC · member since 2026                     |
|           "Weekend hiker, slow but steady. Ask me about       |
|            mushrooms."                                        |
|           Enjoys: hiking, camping, mountain biking, foraging  |
|           [Message]                                           |
+---------------------------------------------------------------+
| I've always wanted to try ... snowboarding                    |
| My favorite place outside is ... the Grand Tetons             |
+---------------------------------------------------------------+
| 2026 adventure goals                       3 of 5 done        |
|  [x] Summit Mount Mitchell                                    |
|  [x] Paddle the French Broad, Section 9                       |
|  [ ] First overnight backpacking trip                         |
+---------------------------------------------------------------+
| Groups                                                        |
| Blue Ridge Dirt Skrrts · Asheville Trail Runners              |
+---------------------------------------------------------------+
```

On phones the photo sits above the name, and each block stacks. Hidden
or blank sections don't appear at all: no empty headings. The owner sees
their hidden sections, marked *hidden: only you see this*.

