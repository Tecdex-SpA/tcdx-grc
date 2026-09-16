FROM node:22.23.2-bookworm-slim

ENV NODE_ENV=qa
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY apps/backend apps/backend
COPY packages/contracts packages/contracts
COPY packages/shared-types packages/shared-types

RUN pnpm --filter @tcdx-grc/backend build

USER node

EXPOSE 4000

CMD ["node", "apps/backend/dist/server.js"]
