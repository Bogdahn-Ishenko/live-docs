# syntax=docker.io/docker/dockerfile:1

FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# build args
ARG NEXT_PUBLIC_WIKILIVE_YJS_URL
ARG WIKILIVE_BACKEND_URL

ENV NEXT_PUBLIC_WIKILIVE_YJS_URL=$NEXT_PUBLIC_WIKILIVE_YJS_URL
ENV WIKILIVE_BACKEND_URL=$WIKILIVE_BACKEND_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN npm install sharp@0.33.5 && npm cache clean --force

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]