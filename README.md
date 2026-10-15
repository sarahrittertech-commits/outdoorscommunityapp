# Branch Outdoors

A plain, fast community board for outdoor groups: find a hiking, paddling or
riding group by category, join it, show up to its events, and talk with the
people in it.

No feed. No ads. No algorithm deciding what you see. Lists are alphabetical
or by date, and they are the same for everyone.

*Branch Outdoors is the product name, chosen 29 September 2026. The domain is not chosen yet.*

## Status

Live at https://branchoutapp-production.up.railway.app/ with every Must
requirement, most Shoulds, about 1,000 database permission tests and 217
unit tests passing. As of 15 October 2026 it covers **45 areas in 8 big
regions** (Southeast, Mid-Atlantic, Northeast, Midwest, Rockies,
Southwest, Far West, Pacific Northwest), from the Western Carolinas and
the Coastal Carolinas to Missoula, Moab, Chicago and Acadia, with about
1,100 communities, 900 guides, shops and venues, and 2,600 upcoming
events. Communities in towns with no area yet are still listed and found
by zip code.

Real groups are listed until their organizers claim them. Research agents
find new ones, and a weekly reader collects dates from 3,500 organizers'
own event pages and calendar feeds. What that work has taught is in
[research and areas — findings](docs/research-findings.md).

## Running it

```bash
npm install
npx supabase start            # needs Docker; loads demo data
cp .env.example .env.local    # paste the URL and anon key it prints
npm run dev                   # http://localhost:3000
```

Details, checks and deployment: [`docs/runbook.md`](docs/runbook.md).

## Stack

Next.js 16 (server-rendered, forms work without JavaScript) · Supabase
Postgres with every permission enforced by row-level security · Railway ·
Resend for email. The reasoning is in the
[architecture decisions](docs/architecture/index.md).

## Documentation

Start with [`docs/index.md`](docs/index.md).

| Document | What it covers |
| --- | --- |
| [Product requirements](docs/prd.md) | Problem, goals, scope, principles, delivery plan |
| [Personas](docs/personas.md) | Who this is for |
| [Feature map](docs/feature-map.md) | What's live versus what's being designed |
| [Use cases](docs/use-cases.md) | The journeys it supports |
| [User flows](docs/user-flows.md) | The screens along each journey |
| [Functional requirements](docs/functional-requirements.md) | What it does, requirement by requirement |
| [Technical requirements](docs/technical-requirements.md) | How it must be built, and what it costs |
| [Roles and permissions](docs/roles-and-permissions.md) | Who can do what |
| [Data model](docs/data-model.md) | Tables, relationships, seed categories |
| [Architecture decisions](docs/architecture/index.md) | Framework, database, hosting, jobs, discussions |
| [Test cases](docs/test-cases.md) | What "working" means |
| [Runbook](docs/runbook.md) | Running, testing, deploying |
| [Research playbook](docs/research-playbook.md) | How research reaches the board |
| [Research and areas — findings](docs/research-findings.md) | Grouping the country into areas, research and event-reader lessons |
| [Cloning](docs/cloning.md) | Making another board (the women's app) from this one |
