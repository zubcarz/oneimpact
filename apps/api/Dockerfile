FROM node:20-alpine
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @oneimpact/api...
RUN pnpm --filter @oneimpact/api build
EXPOSE 5000
CMD ["node", "apps/api/dist/main.js"]
