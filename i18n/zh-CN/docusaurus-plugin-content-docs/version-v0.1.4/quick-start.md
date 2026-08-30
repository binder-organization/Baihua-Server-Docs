---
title: 快速启动
sidebar_label: 快速启动
---

## 快速启动

### 前置条件

- **Docker**（用于 PostgreSQL 数据库）
- **Rust 工具链**（stable，包含 rustfmt 和 clippy）
- **Python 3.10+**，并执行 `pip install -r tests/requirements.txt`（用于测试）

### 开发模式

```bash
# 1. 配置环境变量
cp .env.example .env

# 2. 通过 Docker 启动 PostgreSQL
docker compose up -d database

# 3. 启动服务端（首次启动自动执行数据库迁移）
cargo run
```

服务端运行在 `http://localhost:2424`，终端中会启动交互式控制台——输入 `help` 查看命令。

如需运行完整的测试套件（编译 + 数据库 + 服务端 + pytest）：

```bash
python3 tests/run_tests.py
```
