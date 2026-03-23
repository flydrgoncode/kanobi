# Kanobi

A modern, AI-native cross-platform application — web, mobile, and desktop. Powered by LLMs, built for humans.

---

## Recreate This Project from Scratch (macOS)

> This section is written for another LLM or developer to fully reproduce this project on the same macOS environment.

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| macOS | 14+ (Sonoma) or 15+ (Sequoia) | — |
| Node.js | ≥ 22 | `brew install node` |
| pnpm | 9.15.4 | `npm install -g pnpm` or `sudo npm install -g pnpm` |
| Git | any | pre-installed on macOS |
| GitHub CLI | any | `brew install gh` |
| Docker Desktop | any | https://docs.docker.com/desktop/mac/install/ |
| Rust + Cargo | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` (required for Tauri desktop) |
| Xcode CLI Tools | any | `xcode-select --install` |

> **Note on pnpm:** If `npm install -g pnpm` fails with EACCES, run with `sudo` or install via `corepack enable && corepack prepare pnpm@9.15.4 --activate` (also may need sudo on system Node installs).

### Environment Variables

Create `.env` at the repo root (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in:

```env
ANTHROPIC_API_KEY=sk-ant-...   # Required — get at console.anthropic.com
PORT=3737
NODE_ENV=development
JWT_SECRET=change-me-in-production
DATABASE_PATH=./kanobi.db
CORS_ORIGINS=http://localhost:5173,tauri://localhost
```

### Clone and Run

```bash
git clone https://github.com/flydrgoncode/kanobi.git
cd kanobi
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

pnpm install
pnpm dev              # starts all apps (web + backend)
# or individually:
pnpm dev:web          # http://localhost:5173
pnpm dev:backend      # http://localhost:3737
pnpm dev:mobile       # Expo Go (requires Expo CLI)
```

### Run with Docker

```bash
git clone https://github.com/flydrgoncode/kanobi.git
cd kanobi
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

docker compose up
# Web:     http://localhost:5173
# Backend: http://localhost:3737/api/health
```

### Database Setup

```bash
pnpm db:generate    # generate Drizzle migrations from schema
pnpm db:migrate     # apply migrations to kanobi.db
```

SQLite file is created at `./kanobi.db` (or at `DATABASE_PATH` if set). The Docker volume `db_data` persists it across container restarts.

---

## Stack

| Layer | Technology |
|---|---|
| Web | React 18 + Vite 6 + TypeScript + Tailwind CSS v3 + shadcn/ui |
| Mobile | Expo 52 (React Native) + TypeScript |
| Desktop | Tauri 2.x (wraps web frontend) |
| Backend | Hono 4 + Node.js 22 + TypeScript, port 3737 |
| Database | SQLite via Drizzle ORM + better-sqlite3 (local-first) |
| AI/LLM | Vercel AI SDK 4 + @ai-sdk/anthropic (claude-sonnet-4-6) |
| State | Zustand 5 + TanStack Query v5 |
| Auth | JWT (jose) |
| Monorepo | pnpm workspaces + Turborepo 2 |
| Testing | Vitest |
| CI | GitHub Actions |
| Container | Docker + Docker Compose (multi-stage builds) |

## Structure

```
kanobi/
├── apps/
│   ├── web/                # React SPA (Vite), port 5173
│   │   ├── src/
│   │   │   ├── pages/Welcome.tsx
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── Dockerfile      # multi-stage → nginx
│   │   └── nginx.conf      # SPA fallback + /api proxy
│   ├── mobile/             # Expo React Native
│   └── desktop/            # Tauri 2 wrapper
├── packages/
│   ├── ui/                 # Shared React components (Button, Card)
│   └── types/              # Shared TypeScript types
├── backend/
│   ├── src/
│   │   ├── index.ts        # Hono server entry, port 3737
│   │   ├── routes/
│   │   │   ├── health.ts   # GET /api/health
│   │   │   └── chat.ts     # POST /api/chat (AI streaming)
│   │   └── db/
│   │       ├── schema.ts   # Drizzle tables (messages, conversations)
│   │       ├── index.ts    # DB connection singleton
│   │       └── migrate.ts  # Migration runner
│   ├── drizzle.config.ts
│   ├── Dockerfile          # multi-stage → node:22-alpine
│   └── package.json
├── docker-compose.yml      # backend + web services
├── .env.example
├── package.json            # root workspace scripts
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check — returns `{ status: "ok", timestamp }` |
| POST | `/api/chat` | AI chat stream — body: `{ messages: [{role, content}] }` |

## Development Scripts

```bash
pnpm dev          # all apps via Turborepo
pnpm dev:web      # web only
pnpm dev:backend  # backend only
pnpm dev:mobile   # mobile (Expo)
pnpm build        # production build all
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit all packages
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm db:generate  # Drizzle Kit generate
pnpm db:migrate   # apply migrations
```

## CI

GitHub Actions runs on every push/PR to `main`:
- **typecheck** — `pnpm typecheck` across all packages
- **test** — `pnpm test`
- **docker** — builds `backend/Dockerfile` and `apps/web/Dockerfile` with layer caching

## Known Issues / macOS Notes

- If `pnpm install` fails with `corepack` errors, run `sudo npm install -g pnpm@9.15.4` first.
- Tauri desktop requires Rust (`rustup`) and Xcode CLI tools installed.
- The Expo mobile app requires Expo Go on a physical device or an iOS Simulator with Xcode.
- `DATABASE_PATH` must be an absolute path when running inside Docker (the compose file sets it to `/data/kanobi.db` on the volume).
