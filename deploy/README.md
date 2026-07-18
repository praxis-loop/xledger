# Xledger Deploy

This directory contains Docker Compose entry points for running Xledger from a
Git checkout under `/opt/docker/xledger`.

## Test Server

The Tencent test server uses the shared PostgreSQL service in
`/opt/docker/postgres`. Xledger connects to it over the external Docker network
`postgres-net` using `shared-postgres:5432`; the Xledger compose files do not
start their own PostgreSQL container.

From the repository root:

```bash
git switch main
git fetch origin main
PREVIOUS_SHA="$(git rev-parse HEAD)"
printf '%s\n' "$PREVIOUS_SHA" > .git/deploy-previous-sha
DEPLOY_SHA="$(git rev-parse origin/main)"
git merge --ff-only "$DEPLOY_SHA"
test "$(git rev-parse HEAD)" = "$DEPLOY_SHA"
sudo docker compose -f deploy/docker-compose.dev.yaml up -d --build
```

Verify the deployment:

```bash
sudo docker compose -f deploy/docker-compose.dev.yaml ps
curl -fsS http://127.0.0.1:8080/healthz
curl -fsSI http://127.0.0.1:4174/
```

If verification fails, restore the persisted previous revision and rebuild:

```bash
PREVIOUS_SHA="$(cat .git/deploy-previous-sha)"
test -z "$(git status --porcelain)"
git switch -C main "$PREVIOUS_SHA"
test "$(git rev-parse HEAD)" = "$PREVIOUS_SHA"
sudo docker compose -f deploy/docker-compose.dev.yaml up -d --build
```

## Configuration

Local secret-bearing files stay on the server and are ignored by Git:

- `backend/config/test.yaml`
- `backend/config/production.yaml`
- `deploy/.env`

Copy `deploy/.env.example` to `deploy/.env` only when you need to override the
default ports, image mirrors, or config file path. When using that file, pass it
explicitly:

```bash
sudo docker compose --env-file deploy/.env -f deploy/docker-compose.dev.yaml up -d --build
```

## Production

Use `docker-compose.prd.yaml` with `backend/config/production.yaml` when deploying
a production environment:

```bash
sudo docker compose -f deploy/docker-compose.prd.yaml up -d --build
```
