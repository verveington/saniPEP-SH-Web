FROM node:22-bookworm-slim AS deps

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_PORTAL_BACKEND_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_PORTAL_BACKEND_URL=$NEXT_PUBLIC_PORTAL_BACKEND_URL

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps ./apps

RUN ./node_modules/.bin/next build apps/web --webpack

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/web ./apps/web
COPY --from=build --chown=node:node /app/apps/shared ./apps/shared
COPY --from=build --chown=node:node /app/apps/cms/mock-content ./apps/cms/mock-content

USER node

EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "apps/web", "-H", "0.0.0.0", "-p", "3000"]
