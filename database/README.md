# PostgreSQL Database

Persistent storage for user accounts and authentication data (ADR-002).

## Contents
- `init.sql` — schema (`users` table) and a seeded demo user.
- `docker-compose.yml` — local PostgreSQL 16 instance that auto-runs `init.sql`.

## Run
```bash
docker compose up -d
```

Connection string used by the Authentication Service:
```
postgres://app_user:app_password@localhost:5432/auth_db
```

## Schema
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| email | VARCHAR(255) | Unique, indexed |
| password_hash | VARCHAR(255) | bcrypt hash (ADR-003) |
| created_at | TIMESTAMPTZ | Defaults to `now()` |

Demo user: `demo@example.com` / `password123`.
