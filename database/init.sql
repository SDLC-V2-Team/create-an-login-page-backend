-- PostgreSQL schema for the authentication system (ADR-002).
-- Executed on first container start via docker-entrypoint-initdb.d.

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Seed a demo user.
-- Password is 'password123' hashed with bcrypt (cost 10) per ADR-003.
INSERT INTO users (email, password_hash)
VALUES (
    'demo@example.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
)
ON CONFLICT (email) DO NOTHING;
