# syntax=docker.io/docker/dockerfile:1

###################
# STAGE 1: Dependencies
###################
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

# Копируем файлы манифеста
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

###################
# STAGE 2: Builder
###################
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# --- Build-time Arguments ---
# Переменные с NEXT_PUBLIC_ должны быть объявлены здесь, 
# чтобы Next.js вшил их в JS-бандл во время 'bun run build'
ARG NEXT_PUBLIC_WIKILIVE_YJS_URL

# Секреты и серверные URL (если они нужны для статической генерации страниц)
ARG MWS_GPT_API_KEY
ARG MWS_GPT_MODEL_HINT
ARG MWS_GPT_MODEL_BLOCK
ARG MWS_BACKEND_API_KEY
ARG WIKILIVE_BACKEND_URL
ARG WIKILIVE_WRITE_LOGIN
ARG WIKILIVE_WRITE_PASSWORD
ARG WIKILIVE_YJS_URL

# Переводим ARG в ENV для процесса сборки
ENV NEXT_PUBLIC_WIKILIVE_YJS_URL=${NEXT_PUBLIC_WIKILIVE_YJS_URL}
ENV MWS_GPT_API_KEY=${MWS_GPT_API_KEY}
ENV MWS_GPT_MODEL_HINT=${MWS_GPT_MODEL_HINT}
ENV MWS_GPT_MODEL_BLOCK=${MWS_GPT_MODEL_BLOCK}
ENV MWS_BACKEND_API_KEY=${MWS_BACKEND_API_KEY}
ENV WIKILIVE_BACKEND_URL=${WIKILIVE_BACKEND_URL}
ENV WIKILIVE_WRITE_LOGIN=${WIKILIVE_WRITE_LOGIN}
ENV WIKILIVE_WRITE_PASSWORD=${WIKILIVE_WRITE_PASSWORD}
ENV WIKILIVE_YJS_URL=${WIKILIVE_YJS_URL}

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

###################
# STAGE 3: Runner
###################
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# --- Runtime Environment Variables ---
# Эти переменные будут использоваться на сервере (API Routes / Server Components)
# Их можно переопределить через docker-compose или -e при запуске
ENV MWS_GPT_API_KEY=${MWS_GPT_API_KEY}
ENV MWS_GPT_MODEL_HINT=${MWS_GPT_MODEL_HINT}
ENV MWS_GPT_MODEL_BLOCK=${MWS_GPT_MODEL_BLOCK}
ENV MWS_BACKEND_API_KEY=${MWS_BACKEND_API_KEY}
ENV WIKILIVE_BACKEND_URL=${WIKILIVE_BACKEND_URL}
ENV WIKILIVE_WRITE_LOGIN=${WIKILIVE_WRITE_LOGIN}
ENV WIKILIVE_WRITE_PASSWORD=${WIKILIVE_WRITE_PASSWORD}
ENV WIKILIVE_YJS_URL=${WIKILIVE_YJS_URL}

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Установка sharp для оптимизации изображений (рекомендуется для Next.js)
RUN npm install sharp@0.33.5 && npm cache clean --force

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]