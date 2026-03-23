# Kanobi

A modern, AI-native cross-platform application — web, mobile, and desktop. Powered by LLMs, built for humans.

## Stack

| Layer | Technology |
|---|---|
| Web | React 18 + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui |
| Mobile | Expo (React Native) + TypeScript |
| Desktop | Tauri 2.x (wraps web) |
| Backend | Hono + Node.js + TypeScript, port 3737 |
| Database | SQLite via Drizzle ORM (local-first) |
| AI/LLM | Vercel AI SDK + @ai-sdk/anthropic (claude-sonnet-4-6) |
| State | Zustand + TanStack Query v5 |
| Auth | JWT (jose) |
| Testing | Vitest |
| CI | GitHub Actions |
| Container | Docker + Docker Compose |

## Structure

```
kanobi/
├── apps/
│   ├── web/          # React web (Vite), port 5173 / nginx in Docker
│   ├── mobile/       # Expo React Native
│   └── desktop/      # Tauri 2 wrapper
├── packages/
│   ├── ui/           # Shared React components
│   └── types/        # Shared TypeScript types
├── backend/          # Hono API, port 3737
│   ├── src/
│   │   ├── routes/   # HTTP handlers
│   │   ├── db/       # Drizzle schema + migrations
│   │   └── ai/       # AI SDK helpers
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Quick Start

### Local (pnpm)

```bash
# Install dependencies
pnpm install

# Copy env vars
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env

# Run everything
pnpm dev

# Or individually
pnpm dev:web       # http://localhost:5173
pnpm dev:backend   # http://localhost:3737
pnpm dev:mobile    # Expo Go
```

### Docker

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env

docker compose up
# Web:     http://localhost:5173
# Backend: http://localhost:3737
```

### Docker (backend only)

```bash
docker compose up backend
```

## Development

```bash
pnpm typecheck    # TypeScript check
pnpm test         # Vitest
pnpm lint         # Lint
pnpm build        # Production build

# Database
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Apply migrations
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for AI features |
| `PORT` | `3737` | Backend port |
| `DATABASE_PATH` | `kanobi.db` | SQLite file path |
| `NODE_ENV` | `development` | Environment |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/chat` | AI chat (streaming) |
