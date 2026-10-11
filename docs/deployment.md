---
title: Deployment
sidebar_label: Deployment
---

## Production

Create the production environment file from the dedicated production template:

```bash
cp .env.production.example .env.production
```

`.env.production.example` ships placeholder values. Replace the placeholder database credentials and generate a strong `JWT_SECRET` (for example `openssl rand -base64 64`); the server refuses to start in production without real values. Then start the stack:

```bash
docker compose --env-file .env.production --profile production up -d --build
```

This starts two services:

| Service | Container | Port |
|---------|-----------|------|
| **database** | `baihua-database` | 2423 (localhost only) |
| **server** | `baihua-server` | 2424 (localhost only) |

The database also uses port `5432` within the Compose network. Database records use the `baihua-postgres-data` volume; uploaded avatars use `baihua-avatar-data`; file message bytes use `baihua-file-data`.

Run one server instance for each database and local file volume. File storage, active upload tracking, encrypted session state, and WebSocket connections are local to that process. This version does not provide the shared storage and distributed coordination required by multiple server instances.

The server container entrypoint starts as root only to prepare the application directories, then runs the server as the `baihua` user. When a bind mount rejects ownership changes, startup continues only if that user already has write and traverse access to those directories; otherwise the container exits with a permission error instead of running the server as root. Keep mounted directories writable by that user when you replace a named volume with a bind mount of your own.

For public access, set `BAIHUA_DOMAIN` in `.env.production` to a domain pointing to this host, allow incoming connections on ports 80 and 443, then enable the optional reverse proxy:

```bash
docker compose --env-file .env.production --profile production --profile public up -d --build
```

The reverse proxy forwards WebSocket connections and manages encrypted certificates. Its certificate state uses `baihua-caddy-data`. Without the public profile, the service remains reachable only from the deployment host.

The server is gated by the database health check and includes a Docker HEALTHCHECK (`GET /health`). Logs:

```bash
docker compose --env-file .env.production --profile production --profile public logs -f
```

To stop the stack while preserving all data volumes:

```bash
docker compose --env-file .env.production --profile production --profile public down
```

## Backup

Back up the database, avatars, and file message bytes together during a maintenance window. Stop the server first so local files and database records stay in sync, then restart it after the backup commands, including when a command fails. Create a private, timestamped directory for each backup, copy it to protected storage on another host, and also keep `.env.production` and any custom configuration securely:

```bash
umask 077
backup_directory="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_directory"
docker compose --env-file .env.production --profile production stop server
docker compose --env-file .env.production exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_directory/database.dump"
docker run --rm --mount type=volume,src=baihua-avatar-data,dst=/avatars,readonly --mount "type=bind,src=$PWD/$backup_directory,dst=/backups" alpine tar -C /avatars -cf /backups/avatars.tar .
docker run --rm --mount type=volume,src=baihua-file-data,dst=/files,readonly --mount "type=bind,src=$PWD/$backup_directory,dst=/backups" alpine tar -C /files -cf /backups/files.tar .
docker compose --env-file .env.production --profile production start server
```

When public access is enabled, also back up the certificate state:

```bash
docker run --rm --mount type=volume,src=baihua-caddy-data,dst=/caddy-data,readonly --mount "type=bind,src=$PWD/$backup_directory,dst=/backups" alpine tar -C /caddy-data -cf /backups/caddy-data.tar .
```

## Restore

Restore into a fresh stack with an empty database and empty data volumes. Select a saved backup directory, then restore the database, avatars, and file message bytes before starting the server:

```bash
backup_directory=backups/SELECTED_BACKUP_DIRECTORY
docker compose --env-file .env.production up -d --wait database
docker compose --env-file .env.production exec -T database sh -c 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$backup_directory/database.dump"
docker run --rm --mount type=volume,src=baihua-avatar-data,dst=/avatars --mount "type=bind,src=$PWD/$backup_directory,dst=/backups,readonly" alpine tar -C /avatars -xf /backups/avatars.tar
docker run --rm --mount type=volume,src=baihua-file-data,dst=/files --mount "type=bind,src=$PWD/$backup_directory,dst=/backups,readonly" alpine tar -C /files -xf /backups/files.tar
docker compose --env-file .env.production --profile production up -d server
```

If the backup includes `caddy-data.tar`, restore it to the empty certificate volume and start the public profile:

```bash
docker run --rm --mount type=volume,src=baihua-caddy-data,dst=/caddy-data --mount "type=bind,src=$PWD/$backup_directory,dst=/backups,readonly" alpine tar -C /caddy-data -xf /backups/caddy-data.tar
docker compose --env-file .env.production --profile production --profile public up -d reverse-proxy
```

Rehearse recovery periodically. Verify server health, sign in with an existing account, retrieve an uploaded avatar, and download a file message. Stop the server before restoring into an existing deployment; never overwrite a live database.
