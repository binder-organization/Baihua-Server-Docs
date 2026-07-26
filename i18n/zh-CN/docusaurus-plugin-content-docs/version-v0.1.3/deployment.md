---
title: 生产部署
sidebar_label: 生产部署
---

## 生产部署

使用 Docker Compose 部署整个服务栈：

```bash
# 1. 设置生产环境变量
export JWT_SECRET="your-256-bit-secret"
export POSTGRES_USER="baihua"
export POSTGRES_PASSWORD="strong-password"
export POSTGRES_DB="baihua"

# 2. 构建并启动所有服务（首次构建可能需要 10-15 分钟）
docker compose --profile production up -d --build
```

> 首次构建需要在 Docker 里从零下载并编译所有 Rust 依赖。
> 后续构建由于 Docker 层缓存会快得多。
> 如需查看构建进度，去掉 `-d` 参数：`docker compose --profile production up --build`。

启动后包含两个服务：

| 服务           | 容器名               | 端口       |
|--------------|-------------------|----------|
| **database** | `baihua-database` | 2423（映射） |
| **server**   | `baihua-server`   | 2424     |

服务端依赖数据库健康检查才启动，并自带 Docker HEALTHCHECK（`GET /health`）。查看日志：

```bash
docker compose --profile production logs -f
```

停止并清理：

```bash
docker compose --profile production down -v
```
