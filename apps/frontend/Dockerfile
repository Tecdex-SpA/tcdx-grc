FROM node:22.23.2-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY apps/frontend apps/frontend
COPY packages/contracts packages/contracts
COPY packages/shared-types packages/shared-types

ARG VITE_API_ORIGIN=https://grc-bk.tcdx.int
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN

RUN pnpm --filter @tcdx-grc/frontend build


FROM node:22.23.2-bookworm-slim AS runtime

ENV NODE_ENV=qa
ENV PORT=8080

WORKDIR /app/apps/frontend

COPY --from=build /app/apps/frontend/dist ./dist
COPY --from=build /app/apps/frontend/static-server.mjs ./static-server.mjs

USER node

EXPOSE 8080

CMD ["node", "static-server.mjs"]
