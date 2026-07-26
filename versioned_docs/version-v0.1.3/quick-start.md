---
title: Quick Start
sidebar_label: Quick Start
---

## Quick Start

### Prerequisites

- **Docker** (for PostgreSQL)
- **Rust toolchain** (stable, with rustfmt + clippy)
- **Python 3.10+** and `pip install -r tests/requirements.txt` (for tests)

### Development

```bash
# 1. Set up environment variables
cp .env.example .env

# 2. Start PostgreSQL via Docker
docker compose up -d database

# 3. Start the server (auto-runs migrations on first start)
cargo run
```

The server starts on `http://localhost:2424`. An interactive console is available in the terminal — type `help` for commands.

To run the full test suite (build + DB + server + pytest):

```bash
python3 tests/run_tests.py
```
