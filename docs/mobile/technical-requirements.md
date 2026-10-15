---
sidebar_position: 5
title: Technical requirements
---

# Mobile technical requirements

> **Draft** (14 October 2026). Written for the recommended platform in
> [ADR-M01](./adr-m01-platform), an installable phone-first web app in the
> same code. Rows marked *native only* apply if Sarah picks the native app
> instead. Every rule in the main
> [technical requirements](../technical-requirements) still applies.

| ID | Requirement | Verified by |
| --- | --- | --- |
| TR-MO-1 | **One codebase.** The app layout is the same Next.js routes below 768 px wide, plus a web app manifest so it installs to the home screen with the board's name, icon and colors from `src/config/site.ts` and `src/brand/`. A cloned board gets its own app by changing those files only ([Cloning](../cloning)). | A clone's manifest shows its own name with no code change |
| TR-MO-2 | **Works without JavaScript, better with it.** Every tray has a no-JavaScript form: a filter tray is a `<details>` panel or its own page, a sort is a link, a swipe is a button. JavaScript adds the slide, drag-to-close and live counts. | The test suite runs the main paths with JavaScript off |
| TR-MO-3 | **Fast on a weak signal.** Largest Contentful Paint under 2 s on Lighthouse's mobile profile for *Events* and an event page; under 100 KB of JavaScript (compressed) on first load of *Events*. | Lighthouse in CI |
| TR-MO-4 | **Offline is read-only.** A service worker keeps the app shell, the person's *My week* and the last list they opened, marked *Saved at 7:42 am · offline*. Nothing is written offline except a message or reply draft, which says *Not sent* until it is. Signed-in pages are never cached by a shared cache; the service worker keeps them only on that phone and clears them on sign-out. | Sign out clears every cached personal page |
| TR-MO-5 | **No new server access.** Pages query Supabase as the signed-in person, as today; the service-role key is never used to serve app screens; no new write path skips the server actions' Zod checks or RLS. | Code review; the permission tests pass unchanged |
| TR-MO-6 | **Touch targets** at least 44 × 44 px, 8 px apart; the tab bar and bottom action bars sit above the phone's home indicator (safe-area insets). | Design review on a 375 px and a 430 px screen |
| TR-MO-7 | **Accessibility.** WCAG 2.2 AA. Trays are dialogs: focus moves in, is held there, returns on close; *Escape* and a visible *Close* button close them. Swipes, drags and the letter index all have button or link equivalents. Motion follows `prefers-reduced-motion`. Text grows to 200% without losing content. | axe in CI; VoiceOver and TalkBack checks per release |
| TR-MO-8 | **No tracking.** No analytics SDK, no third-party scripts, no device identifiers (P3). | CSP report shows no third-party hosts |
| TR-MO-9 | **No location permission.** The app never calls the geolocation API. | Code search in CI |
| TR-MO-10 | **Event level and profile stance** are migrations with RLS tests: `events.level` (check constraint, edited only by who may edit the event) and `profile_activities.stance`, `.level` (owner writes; readers follow FR-PR-7 and FR-PR-8). | New pgTAP tests |
| TR-MO-11 | *Native only:* store accounts (Apple Developer, $99 a year; Google Play, $25 once), an Expo project with its own CI, the Supabase client with the anon key and the person's session (never the service-role key), and every server action that the app needs rewritten as a database function with its own checks or a route handler that runs the same Zod schema. | — |
