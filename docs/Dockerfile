# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS build
RUN npm install -g pnpm@10.34.7 && npm cache clean --force
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY docs/package.json docs/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @pitwall/docs...
COPY docs docs
RUN pnpm --filter @pitwall/docs build

FROM nginx:1.29-alpine
COPY --from=build /repo/docs/.vitepress/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri $uri.html $uri/ =404; }\n  error_page 404 /404.html;\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
