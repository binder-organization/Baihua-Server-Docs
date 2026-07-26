---
title: Deployment
sidebar_label: Deployment
---

## Production

Deploy the entire stack with Docker Compose:

```bash
# 1. Set production environment variables
export JWT_SECRET="your-256-bit-secret"
export POSTGRES_USER="baihua"
export POSTGRES_PASSWORD="strong-password"
export POSTGRES_DB="baihua"

# 2. Build and start everything (first build may take 10-15 min)
docker compose --profile production up -d --build
```

> The first build downloads and compiles all Rust dependencies from scratch inside Docker.
> Subsequent builds are much faster thanks to Docker's layer caching.
> To watch build progress, use `docker compose --profile production up --build` (without `-d`).

This starts two services:

| Service | Container | Port |
|---------|-----------|------|
| **database** | `baihua-database` | 2423 (mapped) |
| **server** | `baihua-server` | 2424 |

The server is gated by the database health check and includes a Docker HEALTHCHECK (`GET /health`). Logs:

```bash
docker compose --profile production logs -f
```

To stop and clean up:

```bash
docker compose --profile production down -v
```
