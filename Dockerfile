# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app
# Node 26 no longer bundles corepack; install it to activate Yarn 4
# (the version pinned by the packageManager field in package.json).
RUN npm install -g corepack && corepack enable

# =========================
# Install dependencies
# =========================
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# =========================
# Build the Next.js app
# =========================
FROM base AS builder
# NEXT_PUBLIC_* vars are inlined at build time; override with:
#   docker build --build-arg NEXT_PUBLIC_WS_URL=wss://your-host:3001 .
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID
ENV NEXT_PUBLIC_DISCORD_CLIENT_ID=$NEXT_PUBLIC_DISCORD_CLIENT_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# =========================
# Production runner
# =========================
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY package.json yarn.lock .yarnrc.yml ./
EXPOSE 3000
CMD ["yarn", "start"]
