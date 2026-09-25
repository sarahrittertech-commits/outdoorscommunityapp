# Outdoors Community Board

A plain, fast community board for outdoor groups: find a hiking, paddling or
riding group by category, join it, show up to its events, and talk with the
people in it.

No feed. No ads. No algorithm deciding what you see. Lists are alphabetical
or by date, and they are the same for everyone.

*Working name.*

## Status

Built and working locally: every Must requirement, most Shoulds, 125
database permission tests and 24 unit tests. Next: visual design, then
launch setup. Not yet deployed.

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
| [Use cases](docs/use-cases.md) | The journeys it supports |
| [Functional requirements](docs/functional-requirements.md) | What it does, requirement by requirement |
| [Technical requirements](docs/technical-requirements.md) | How it must be built, and what it costs |
| [Roles and permissions](docs/roles-and-permissions.md) | Who can do what |
| [Data model](docs/data-model.md) | Tables, relationships, seed categories |
| [Architecture decisions](docs/architecture/index.md) | Framework, database, hosting, jobs, discussions |
| [Test cases](docs/test-cases.md) | What "working" means |
| [Runbook](docs/runbook.md) | Running, testing, deploying |
| [Cloning](docs/cloning.md) | Making another board (the women's app) from this one |
