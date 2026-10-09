---
sidebar_position: 2.6
title: User stories
---

# User stories

The product's user stories, written for **any board built on this tool**
(Branch Outdoors today, Sage Women next), not for one audience. Each story
names who wants it, what they want and why, and links to the use case and
requirements that make it testable. Board-specific wording, categories and
looks live in each board's own settings and brand files
([Cloning](./cloning)); the stories here travel with the shared code.

**Status:** *Live* is built and running; *Built* is merged and waiting to be
switched on in production; *Draft* awaits review; *Decision needed* has an
open product question. The [feature request log](./feature-requests)
records where each one came from.

## Finding things

| As a… | I want to… | So that… | Use case | Requirements | Status |
| --- | --- | --- | --- | --- | --- |
| visitor | browse groups and events by activity without signing up | I can see what's out there before giving anything away | UC-1 | FR-BR-1 to FR-BR-5 | Live |
| visitor | search for events near a town I pick, within a distance | I find things I can actually get to | UC-14 | FR-BR-12 to FR-BR-15 | Live (towns; no zip codes yet) |
| visitor | see where people are heading on a map and a list | I discover new places to go | UC-15 | FR-BR-16 to FR-BR-18 | Live (towns; no place pages yet) |
| visitor | see a group's own website | I can learn more about them off the board | — | FR-GR-23 | Built |

## Accounts

| As a… | I want to… | So that… | Use case | Requirements | Status |
| --- | --- | --- | --- | --- | --- |
| newcomer | sign up with my email and a password I choose, after confirming my email | signing in is familiar and doesn't wait on an email every time | UC-29 | FR-AC-17 to FR-AC-21, ADR-0009 | Draft |
| member | reset a forgotten password from the sign-in page | I'm never locked out | UC-29 | FR-AC-20 | Draft |
| newcomer | get sign-in and confirmation emails that sound like the board | I trust the email and know where it came from | UC-25 | FR-AC-11 to FR-AC-13 | Draft (needs a domain) |
| reviewer | look around as a read-only demo member | I can see the signed-in pages without an email | UC-28 | FR-AC-14 to FR-AC-16 | Decision needed |

## Joining and showing up

| As a… | I want to… | So that… | Use case | Requirements | Status |
| --- | --- | --- | --- | --- | --- |
| member | join a group and RSVP to its events | the organizer knows I'm coming | UC-2 | FR-MB-1, FR-EV-3 | Live |
| member | join through an invite link a group shared with me, creating my account on the same page | I'm in without waiting for approval | UC-31 | FR-MB-14, FR-MB-15 | Built |
| member | join the waitlist when an event is full | I get a place if someone drops out | UC-30 | FR-EV-28 | Draft |
| member | see what an event costs, the registration fee and the total | I know before I commit | UC-30 | FR-EV-25 | Draft |

## Running a group

| As a… | I want to… | So that… | Use case | Requirements | Status |
| --- | --- | --- | --- | --- | --- |
| organizer | start a group and post its events | people can find us and come | UC-3 | FR-GR-1, FR-EV-1 | Live |
| organizer | post an event with a description, details and a photo | people know what it is and want to come | UC-30 | FR-EV-23, FR-EV-24 | Draft |
| organizer | choose whether an event takes RSVPs here, or link to our own sign-up page | I use the board my way | UC-30 | FR-EV-26, FR-EV-27 | Draft |
| organizer | mark an event Free or Paid with its fee and total cost | nobody is surprised by a cost | UC-30 | FR-EV-25 | Draft |
| page admin | add up to two page managers who help run the group | I'm not doing it alone, and only I can hand the group over | UC-31 | FR-MB-11, FR-MB-12 | Built (manager email invites wait on email) |
| page admin or manager | invite people by email, one address or many | I bring our club onto the board in one go | UC-31 | FR-MB-13 | Built, off until email is set up |
| page admin or manager | create a link to send to people so they can join | I can share it in our group chat | UC-31 | FR-MB-15 | Built |
| organizer | add our group's website | members can find our own site | — | FR-GR-23 | Built |
| organizer | claim a listing of our real group | I run it here instead of starting over | UC-8 | FR-GR-9, FR-GR-10 | Live |
| organizer | prove a claim with an email at our club's domain | the site admin can approve it quickly | UC-26 | FR-GR-18 to FR-GR-20 | Draft (needs a domain) |

## Keeping the board healthy

| As a… | I want to… | So that… | Use case | Requirements | Status |
| --- | --- | --- | --- | --- | --- |
| site admin | have new groups and events suggested from public sources | the board fills up without me searching | UC-9 | FR-RS-1 to FR-RS-9 | Live (cloud permission pending) |
| site admin | see suggestions that look like something already listed, tagged *possible duplicate* | I don't list the same group twice; exact matches never reach me | UC-9 | FR-RS-3, FR-RS-10 | Built |
| site admin | review a person's first group before it's listed | spam never reaches the listings | UC-27 | FR-GR-8, FR-GR-21, FR-GR-22 | Decision needed |
| member | report anything that breaks the rules | moderators can act on it | UC-6 | FR-MD-1 to FR-MD-6 | Live |
| member | suggest a region, a feature, a group to invite or an event to add | the board grows where people want it | UC-32 | FR-AD-4, FR-AD-5, FR-AD-7 | Built |
| site admin | see every suggestion in one place and mark it planned, done or declined | nothing gets lost and members hear back | UC-32 | FR-AD-6 | Built |
