# Tilen Kungu Website

## Backend database setup

The API uses PostgreSQL for users, contacts, and sessions. Hosted environments should provide a `DATABASE_URL`; local development can use the individual `PG_*` variables shown in `.env.example`. In production, the pool uses TLS by default. Set `PGSSL_DISABLE=true` only for a local PostgreSQL server that does not support TLS.

Before serving authenticated traffic, apply the committed migrations against the intended database:

```bash
npm ci
npm run db:migrate
npm start
```

Migrations are tracked in `schema_migrations` and guarded by a PostgreSQL advisory lock, so concurrent serverless cold starts do not apply the same migration twice. The first migration creates or upgrades `users` and `contacts`, adds `sessions`, and creates the supporting indexes. Existing contact rows remain valid; their `user_id` is nullable.

Session tokens are generated with cryptographically secure random bytes. The browser receives the token, while PostgreSQL stores only its SHA-256 hash. Sessions expire based on `SESSION_TTL_SECONDS` (seven days by default), and expired rows are cleaned opportunistically during login.
