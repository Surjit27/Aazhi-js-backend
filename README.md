# Aazhi Backend

Express API — PostgreSQL + MongoDB. **Runs in Docker** (API + both databases).

## Requirements

- [Docker](https://docs.docker.com/get-docker/) + Compose v2

## Start (Docker only)

```bash
cd backend
docker compose up --build
```

Detached:

```bash
npm run docker:up:detached
# or: docker compose up --build -d
```

| URL | Purpose |
|-----|---------|
| http://localhost:4000/api/health | Health + DB status |
| http://localhost:4000/api/ready | Readiness |

Stop: `docker compose down` · wipe DB volumes: `docker compose down -v`

### Docker “permission denied” on `docker.sock`

After `sudo usermod -aG docker $USER`, you must **log out and back in** (or reboot).

Until then, either:

```bash
newgrp docker          # new shell with docker group in this terminal only
docker compose up -d postgres mongo
```

or run once with sudo:

```bash
sudo docker compose up -d postgres mongo
```

Check DB ports: `ss -tln | grep -E '5433|27017'`

`CORS_ORIGIN` defaults to `http://localhost:5173` for a frontend running on the host.

## Optional: local Node dev

Requires **Node 20+** (default shell may be Node 16 — use nvm):

```bash
nvm install 20
nvm use 20          # or: nvm use   (reads .nvmrc)
node -v             # must show v20.x

cp .env.example .env
npm install
npm run docker:db   # Postgres :5433 + Mongo :27017 (avoids local Postgres on 5432)
npm run dev         # http://localhost:4000
```

Hot reload (Node 20+ only): `npm run dev:watch`

## Auth (PostgreSQL + JWT)

User accounts live in **PostgreSQL** (`users` table: `admin` | `client` roles). **MongoDB** stays for app/document data — not for login.

**Two portals (same idea as Ad-portal, role-only):**

| Portal | Frontend host | `X-App-Surface` | Who can log in |
|--------|---------------|-----------------|----------------|
| Admin | `admin.localhost` | `admin` | `admin` users only |
| Client | `localhost` | `client` | `client` users only |

Login rejects wrong role for the portal. Authenticated routes also require `req.auth.role` to match `X-App-Surface`. Admin user APIs require admin portal + admin role.

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/login` | Public `{ email, password }` + portal header → `{ token, user }` |
| GET | `/api/auth/me` | Bearer + matching portal |
| GET | `/api/auth/users` | Admin portal + admin role |
| POST | `/api/auth/users` | Admin portal + admin role — create `admin` or `client` |

Default admin (seeded on first start): see `.env` `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Protected examples: `/api/admin/summary` (admin), `/api/client/summary` (client).

## Endpoints

| Method | Path |
|--------|------|
| GET | `/api/health` |
| GET | `/api/ready` |
| GET | `/api/orders` (stub) |

## Layout

```
Dockerfile
docker-compose.yml   # api + postgres + mongo
src/
```
