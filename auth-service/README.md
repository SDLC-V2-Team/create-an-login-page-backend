# Authentication Service

Stateless authentication backend implementing **ADR-001 (JWT)**, **ADR-002 (PostgreSQL)**, **ADR-003 (bcrypt)** and **ADR-004 (REST endpoints)**.

## Stack
- Node.js 20 + TypeScript
- Express (REST API)
- `jsonwebtoken` (access + refresh JWTs)
- `bcrypt` (cost factor 10) for password hashing
- `pg` for PostgreSQL connectivity

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create an account (seed/helper). |
| POST | `/auth/login` | Verify credentials, return access + refresh tokens. |
| POST | `/auth/logout` | Revoke a refresh token. |
| GET | `/auth/me` | Return current user (requires `Authorization: Bearer <token>`). |
| GET | `/health` | Liveness probe. |

## Getting started
```bash
cp .env.example .env   # adjust secrets and DATABASE_URL
npm install
npm run dev            # development with hot reload
# or
npm run build && npm start
```

## Example
```bash
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}'
```

## Notes
- Refresh-token revocation uses an in-memory blacklist. Replace `tokenService` storage with Redis for multi-instance deployments.
- The seeded demo user (see the database repo `init.sql`) is `demo@example.com` / `password123`.
