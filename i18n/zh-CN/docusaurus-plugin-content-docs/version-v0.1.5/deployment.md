---
title: 生产部署
sidebar_label: 生产部署
---

## 生产部署

创建生产环境配置文件：

```bash
cp .env.production.example .env.production
```

`.env.production.example` 中提供的是占位值。请替换其中的数据库占位凭据，并生成足够强的 `JWT_SECRET`（例如 `openssl rand -base64 64`）；生产环境下缺少真实取值时服务端会拒绝启动。然后启动服务：

```bash
docker compose --env-file .env.production --profile production up -d --build
```

启动后包含两个服务：

| 服务           | 容器名               | 端口       |
|--------------|-------------------|----------|
| **database** | `baihua-database` | 2423（仅本机） |
| **server**   | `baihua-server`   | 2424（仅本机） |

数据库在编排网络内使用端口 `5432`。数据库记录保存在 `baihua-postgres-data` 卷，上传的头像保存在 `baihua-avatar-data` 卷，文件消息字节保存在 `baihua-file-data` 卷。

每组数据库与本地文件卷只运行一个服务端实例。文件存储、活跃上传跟踪、加密会话状态和 WebSocket 连接都属于单个服务端进程；当前版本不提供多实例所需的共享文件存储与分布式协调。

服务端容器的入口脚本仅以 root 身份准备应用目录，随后以 `baihua` 用户身份运行服务端。绑定挂载拒绝修改属主时，只有当该用户对这些目录已经具备写权限和遍历权限，启动才会继续；否则容器会以权限错误退出，而不会改以 root 身份运行服务端。用自定义绑定挂载替换命名卷时，请确保挂载目录对该用户可写。

如需公开访问，在 `.env.production` 中将 `BAIHUA_DOMAIN` 设为指向此主机的域名，允许外部连接端口 80 和 443，再启用可选反向代理：

```bash
docker compose --env-file .env.production --profile production --profile public up -d --build
```

反向代理转发 WebSocket 连接并管理加密证书。证书状态保存在 `baihua-caddy-data` 卷。未启用公开配置时，只能从部署主机访问服务。

服务端依赖数据库健康检查才启动，并自带 Docker HEALTHCHECK（`GET /health`）。查看日志：

```bash
docker compose --env-file .env.production --profile production --profile public logs -f
```

停止服务并保留全部数据卷：

```bash
docker compose --env-file .env.production --profile production --profile public down
```

## 备份

在维护窗口中先停止服务端，再一起备份数据库、头像和文件消息字节，避免备份期间的上传造成数据不一致。备份结束后重新启动服务端，命令失败时也要重新启动。每次创建独立的私有时间戳目录，将其复制到另一台主机的受保护存储中，并安全保存 `.env.production` 及自定义配置：

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

启用了公开访问时，再备份证书状态：

```bash
docker run --rm --mount type=volume,src=baihua-caddy-data,dst=/caddy-data,readonly --mount "type=bind,src=$PWD/$backup_directory,dst=/backups" alpine tar -C /caddy-data -cf /backups/caddy-data.tar .
```

## 恢复

使用全新创建、数据库与数据卷均为空的服务栈。选定已有备份目录，先恢复数据库、头像和文件消息字节，再启动服务端：

```bash
backup_directory=backups/SELECTED_BACKUP_DIRECTORY
docker compose --env-file .env.production up -d --wait database
docker compose --env-file .env.production exec -T database sh -c 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$backup_directory/database.dump"
docker run --rm --mount type=volume,src=baihua-avatar-data,dst=/avatars --mount "type=bind,src=$PWD/$backup_directory,dst=/backups,readonly" alpine tar -C /avatars -xf /backups/avatars.tar
docker run --rm --mount type=volume,src=baihua-file-data,dst=/files --mount "type=bind,src=$PWD/$backup_directory,dst=/backups,readonly" alpine tar -C /files -xf /backups/files.tar
docker compose --env-file .env.production --profile production up -d server
```

若备份中有 `caddy-data.tar`，将其恢复到空的证书卷后启动公开访问服务：

```bash
docker run --rm --mount type=volume,src=baihua-caddy-data,dst=/caddy-data --mount "type=bind,src=$PWD/$backup_directory,dst=/backups,readonly" alpine tar -C /caddy-data -xf /backups/caddy-data.tar
docker compose --env-file .env.production --profile production --profile public up -d reverse-proxy
```

定期演练恢复，并检查服务端健康状态、已有账户能否登录、上传头像能否读取以及文件消息能否下载。向现有部署恢复前必须停止服务端，不要覆盖正在使用的数据库。
