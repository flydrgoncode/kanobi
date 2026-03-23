# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --filter @kanobi/web...

# Build
FROM deps AS builder
COPY tsconfig.base.json ./
COPY apps/web/ ./apps/web/
COPY packages/ui/ ./packages/ui/
COPY packages/types/ ./packages/types/
RUN pnpm --filter @kanobi/web build

# Serve with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
