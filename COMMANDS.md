# WorldHost Command Guide

This guide lists the exact commands to install, build, run, test, seed, and interact with the WorldHost server.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Install

```bash
pnpm install
```

## Development Server

Runs TypeScript directly with file watching.

```bash
pnpm dev
```

- URL: http://localhost:8080
- WS: ws://localhost:8080/ws

## Build

Compile TypeScript for all packages.

```bash
pnpm build
```

## Production Start

Build then run compiled server.

```bash
pnpm start:prod
# or manual
node packages/server/dist/index.js
```

Environment variables (examples):

```bash
set NODE_ENV=production
set PORT=8080
set WORLDHOST_METRICS_ENABLED=false
set WORLDHOST_OPEN_VISUALIZER=false
```

## Seeding Demo World

Option A: server-integrated seed via script

```bash
pnpm --filter @worldhost/server seed
```

Option B: standalone helper (from repo root)

```bash
node seed-demo.js
```

## Test Suite

Run all unit/integration tests (Vitest):

```bash
pnpm test
```

## HTTP Endpoint Smoke Test

After the server is running:

```bash
node test-api.js
```

Key endpoints:
- GET `/` – server info
- GET `/health` – basic health
- GET `/stats` – world + ECS stats
- POST `/world/layers` – create a layer
- POST `/world/archetypes` – define archetype
- POST `/spawn` – spawn entity
- POST `/save` – persist state
- POST `/load` – load state

## WebSocket Protocol Test

After the server is running:

```bash
node test-websocket.js
```

This test exercises hello handshake, chunk subscription, movement, and basic interactions.

## Linting & Type Checking

```bash
pnpm lint
pnpm lint:fix
pnpm typecheck
```

## Useful Environment Variables

- `PORT` – HTTP/WS port (default: 8080)
- `WORLDHOST_OPEN_VISUALIZER` – open built-in visualizer page (default: true)
- `WORLDHOST_TICK_RATE_DISABLED` – disable game loop for event-driven only
- `WORLDHOST_TARGET_FPS` – game loop target FPS (default: 60)
- `WORLDHOST_METRICS_ENABLED` – expose `/metrics` for Prometheus
- `WORLDHOST_DATA_DIR` – save/load directory (default: ./data)

See `packages/server/src/config.ts` for a full list.


