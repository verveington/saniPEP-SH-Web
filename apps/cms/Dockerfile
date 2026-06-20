FROM node:22-bookworm-slim AS build

WORKDIR /app/apps/cms

ENV STRAPI_TELEMETRY_DISABLED=true

COPY apps/cms/package.json apps/cms/package-lock.json ./
RUN npm ci

COPY apps/cms ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app/apps/cms

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1337 \
    STRAPI_TELEMETRY_DISABLED=true

COPY --from=build /app/apps/cms ./

EXPOSE 1337
CMD ["npm", "run", "start"]
