# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --filter @kanobi/backend...

# Build
FROM deps AS builder
COPY tsconfig.base.json ./
COPY backend/ ./backend/
COPY packages/types/ ./packages/types/
RUN pnpm --filter @kanobi/backend build

# Runtime
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3737
CMD ["node", "dist/index.js"]
