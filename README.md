# Kanobi

Kanobi is a multi-tenant strategy and operations platform with three distinct product surfaces:

- `Mission Control`
  Global admin surface operated by the `god` user.
- `Workspace`
  Tenant-aware company administration surface.
- `Cowork`
  Tenant-first collaboration surface where companies work on strategy, groups and meetings.

The current implementation is built around a single PostgreSQL database, a Hono backend, and a React/Vite frontend.

## What The App Is

Kanobi is inspired by the V2MOM operating model and is being shaped into a real SaaS product with:

- tenant and user management
- company onboarding and company administration
- workspace roles and permission blocks
- LLM and email configuration
- `Cowork` strategy entities:
  - vision
  - values
  - obstacles
- `Cowork` collaboration and operational entities:
  - groups
  - meetings
  - meeting cadence/types

There is a special tenant called `Zero` used by `Mission Control` for platform-level setup.

## Product Surfaces

### Mission Control

Global surface for the `god` user. It includes:

- dashboard
- users
- convites
- companies
- permissions
- Zero setup
  - Platform
  - Seed Data
  - Danger Zone

Mission Control supports:

- `God mode`
  - sees all companies, users and requests
- `Tenant mode`
  - chosen from the company selector at the top
  - filters users, companies, requests and permissions by company

### Workspace

Company administration surface. Right now it includes:

- users
- convites
- companies
- permissions
- funcional
  - cadencia
- zero setup

`Cadencia` is global and not tenant-scoped.

### Cowork

Tenant-first operational surface. It includes:

- overview
- metricas
- metodos
- support
  - strategy
  - grupos
  - utilizadores
  - reunioes

`Support` is only accessible to `support`, `superuser`, or `god` impersonating a tenant.

## Current Architecture

### Frontend

- React
- Vite
- TypeScript
- TanStack Query
- React Router

Main frontend area:

- [apps/web/src](/Users/ruipereira/kanobi/apps/web/src)

Important files:

- [App.tsx](/Users/ruipereira/kanobi/apps/web/src/App.tsx)
- [Sidebar.tsx](/Users/ruipereira/kanobi/apps/web/src/components/Sidebar.tsx)
- [Header.tsx](/Users/ruipereira/kanobi/apps/web/src/components/Header.tsx)
- [Layout.tsx](/Users/ruipereira/kanobi/apps/web/src/components/Layout.tsx)
- [workspace-api.ts](/Users/ruipereira/kanobi/apps/web/src/lib/workspace-api.ts)
- [tenant-selection.tsx](/Users/ruipereira/kanobi/apps/web/src/context/tenant-selection.tsx)

### Backend

- Hono
- Node.js
- TypeScript
- Drizzle ORM

Main backend area:

- [backend/src](/Users/ruipereira/kanobi/backend/src)

Important files:

- [index.ts](/Users/ruipereira/kanobi/backend/src/index.ts)
- [workspace.ts](/Users/ruipereira/kanobi/backend/src/routes/workspace.ts)
- [schema.ts](/Users/ruipereira/kanobi/backend/src/db/schema.ts)

### Database

The app now uses PostgreSQL, not SQLite.

Important data model areas already created:

- auth users
- auth sessions
- tenants
- tenant memberships
- platform roles
- tenant roles
- permissions
- tenant-scoped role permissions
- join requests
- company setup
- LLM configs
- email configs
- workspace access log
- strategy entities
- groups
- meetings
- meeting types / cadence
- comments and reactions foundations

Schema file:

- [schema.ts](/Users/ruipereira/kanobi/backend/src/db/schema.ts)

## Ports And Runtime

Current local ports:

- web: `5180`
- backend: `3738`
- postgres: `55432`

Local URLs:

- web: [http://127.0.0.1:5180](http://127.0.0.1:5180)
- backend health: [http://127.0.0.1:3738/api/health](http://127.0.0.1:3738/api/health)

Postgres connection:

- host: `host.docker.internal:55432`
- database: `kanobi`
- user: `kanobi`
- password: `kanobi`

## Run The App

### Docker

```bash
git clone https://github.com/flydrgoncode/kanobi.git
cd kanobi
docker compose up -d --build
```

Then open:

- [http://127.0.0.1:5180](http://127.0.0.1:5180)

### Useful Commands

```bash
docker compose ps
docker compose up -d --build web
docker compose up -d --build backend
curl http://127.0.0.1:3738/api/health
```

### Typecheck And Build

```bash
npm --prefix apps/web run build
npm --prefix backend run typecheck
```

## How Session Context Works

Tenant context is not trusted from the browser DOM.

The app uses server-side session context:

- current session is stored in PostgreSQL
- active tenant is stored in session on the backend
- frontend asks the backend for context
- backend resolves tenant access from session + role

This is what prevents a user from just editing HTML and swapping tenant ids manually.

## How To Reconstruct Context For A New LLM

If a new LLM takes over the repo, it should rebuild context in this order:

### 1. Start from the product surfaces

Read:

- [App.tsx](/Users/ruipereira/kanobi/apps/web/src/App.tsx)
- [Sidebar.tsx](/Users/ruipereira/kanobi/apps/web/src/components/Sidebar.tsx)
- [Header.tsx](/Users/ruipereira/kanobi/apps/web/src/components/Header.tsx)

This explains:

- Mission Control routes
- Workspace routes
- Cowork routes
- tenant selector behavior

### 2. Read the backend entry and main route file

Read:

- [index.ts](/Users/ruipereira/kanobi/backend/src/index.ts)
- [workspace.ts](/Users/ruipereira/kanobi/backend/src/routes/workspace.ts)

This explains:

- session handling
- `god` mode
- tenant context
- CRUD endpoints
- role access rules

### 3. Read the database schema

Read:

- [schema.ts](/Users/ruipereira/kanobi/backend/src/db/schema.ts)

This is the source of truth for:

- auth
- tenancy
- permissions
- strategy
- groups
- meetings

### 4. Check the main UI pages

Mission Control:

- [MissionControl.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/MissionControl.tsx)
- [Users.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/Users.tsx)
- [Requests.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/Requests.tsx)
- [Companies.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/Companies.tsx)
- [Permissions.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/Permissions.tsx)
- [Integrations.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/Integrations.tsx)
- [SeedData.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/SeedData.tsx)

Cowork:

- [CoworkOverview.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/CoworkOverview.tsx)
- [CoworkStrategy.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/CoworkStrategy.tsx)
- [CoworkUsers.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/CoworkUsers.tsx)
- [CoworkGroups.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/CoworkGroups.tsx)
- [CoworkMeetings.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/CoworkMeetings.tsx)

Workspace:

- [CoworkMeetingTypes.tsx](/Users/ruipereira/kanobi/apps/web/src/pages/CoworkMeetingTypes.tsx)

### 5. Rebuild runtime locally

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3738/api/health
```

### 6. Verify key pages

- Mission Control: [http://127.0.0.1:5180/mission-control](http://127.0.0.1:5180/mission-control)
- Cowork meetings: [http://127.0.0.1:5180/cowork/support/meetings](http://127.0.0.1:5180/cowork/support/meetings)
- Workspace cadence: [http://127.0.0.1:5180/workspace/functional/meeting-types](http://127.0.0.1:5180/workspace/functional/meeting-types)

## Notes For Future Work

- `Workspace` and `Cowork` are now clearly separate surfaces
- `Cadencia` is global and not tied to any tenant
- real `Cowork` meetings are tenant-scoped
- `Zero` is protected and should remain unique
- `god` can operate in global mode and impersonate a company context

## Repository

Remote:

- [https://github.com/flydrgoncode/kanobi](https://github.com/flydrgoncode/kanobi)
