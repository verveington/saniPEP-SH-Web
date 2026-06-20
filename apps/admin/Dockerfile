FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/admin ./apps/admin
COPY apps/frontend ./apps/frontend
COPY apps/shared ./apps/shared

ARG VITE_PORTAL_BACKEND_URL
ENV VITE_PORTAL_BACKEND_URL=$VITE_PORTAL_BACKEND_URL
RUN test -n "$VITE_PORTAL_BACKEND_URL"
RUN npm run build:admin

FROM nginx:1.27-alpine AS runtime

COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 8080
