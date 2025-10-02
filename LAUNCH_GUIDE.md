# WorldHost Launch Guide

Step-by-step instructions to deploy and launch the WorldHost server for live web testing and production.

## 1) Requirements

- Node.js 20+
- pnpm 9+
- Windows, macOS, or Linux host with outbound internet

## 2) Configuration

Minimal environment for live testing:

```bash
set NODE_ENV=production
set PORT=8080
set WORLDHOST_OPEN_VISUALIZER=false
```

Optional (enable metrics):

```bash
set WORLDHOST_METRICS_ENABLED=true
```

Data directory (for save/load):

```bash
set WORLDHOST_DATA_DIR=./data
```

Full list of tunables in `packages/server/src/config.ts`.

## 3) Build & Start

From the repository root:

```bash
pnpm install
pnpm build
pnpm start:prod
```

You should see logs similar to:

```
🚀 WorldHost server running on port 8080
📡 WebSocket endpoint: ws://localhost:8080/ws
🌐 HTTP API: http://localhost:8080
📊 Stats: http://localhost:8080/stats
💚 Health: http://localhost:8080/health
```

## 4) Seeding Demo Content (Optional)

You can seed demo layers, entities, and structures:

```bash
pnpm --filter @worldhost/server seed
# or
node seed-demo.js
```

## 5) Health & Smoke Tests

With the server running:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/stats
```

Run the included test scripts:

```bash
node test-api.js
node test-websocket.js
```

## 6) Exposing to the Web

If deploying on a server or VM:

- Open TCP port 8080 on the firewall
- Or set `PORT` to an allowed port
- Put a reverse proxy (optional) in front, e.g. Nginx/Traefik

Example Nginx (HTTP only):

```
server {
  listen 80;
  server_name your.domain.com;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://127.0.0.1:8080;
  }
}
```

## 7) Windows Service (Optional)

Use NSSM or a scheduled task to run the server on boot:

- Command: `node C:\path\to\repo\packages\server\dist\index.js`
- Working dir: repository root

## 8) Docker (Optional)

If you maintain a Dockerfile, build and run:

```bash
docker build -t worldhost .
docker run -e PORT=8080 -p 8080:8080 worldhost
```

## 9) Troubleshooting

- Port in use: change `PORT` or stop other process
- Health fails: check console output; ensure build succeeded
- WebSocket blocked: check firewall and reverse proxy Upgrade headers
- Save/Load errors: ensure `WORLDHOST_DATA_DIR` exists and is writable

## 10) Shut Down

Press Ctrl+C in the terminal, or stop the service. The server handles SIGINT/SIGTERM gracefully.


