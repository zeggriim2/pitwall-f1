# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.7 && npm cache clean --force
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY docs/package.json docs/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @pitwall/web...
COPY tsconfig.base.json ./

# Hot-reload stage: sources arrive via bind mount, Metro serves them.
FROM base AS dev
ENV NODE_ENV=development EXPO_NO_TELEMETRY=1
WORKDIR /repo/apps/web
EXPOSE 8081
CMD ["pnpm", "dev"]

FROM base AS build
COPY packages/contracts packages/contracts
COPY apps/web apps/web
# Empty API URL: the bundle calls /api on its own origin (proxied by nginx).
ENV CI=1 EXPO_PUBLIC_API_URL=""
RUN pnpm --filter @pitwall/web typecheck && pnpm --filter @pitwall/web build

FROM nginx:1.29-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
