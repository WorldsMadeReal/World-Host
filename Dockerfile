FROM node:20-alpine

# Enable pnpm via Corepack (uses version from package.json "packageManager")
RUN corepack enable

WORKDIR /app

# Install dependencies first (better layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/server/package.json packages/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build
COPY . .
# Use TypeScript project references to build in the right order
RUN pnpm exec tsc -b

# Runtime env
ENV NODE_ENV=production
ENV PORT=8080
ENV WORLDHOST_OPEN_VISUALIZER=false

EXPOSE 8080

CMD ["node", "packages/server/dist/index.js"]


