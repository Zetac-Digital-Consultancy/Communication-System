# Production deployment

Source changes are prepared locally; production server access is not yet established.
Docker and Xcode are unavailable on this Windows host. Container, browser visual and
physical iPhone testing remain required. Passing web tests do not certify the live service.

## Configuration

- Keep `SESSION_SECRET` unique, random and at least 32 characters; never commit it.
- Set `APP_URL=https://communication-system.zetac.de` and `COOKIE_SECURE=true`.
- Set `PRIVACY_POLICY_URL` once published; this exposes the policy link in Help & Privacy.
- Leave `SEED_DEMO_DATA=false`. Disable/delete any existing live demo users.
- For a new database, run the one-time administrator setup described in README.md.
  The seed command no longer creates demo accounts or messages. It requires your own
  explicit credentials and will not overwrite an existing administrator.
  After migrations, with the three `INITIAL_ADMIN_*` values supplied in your environment
  file, the Docker equivalent is:

  ```sh
  docker compose run --rm --no-deps --entrypoint node app node_modules/tsx/dist/cli.mjs prisma/seed.ts
  ```

  Remove the setup variables afterward and recreate the app container to remove them
  from its environment. Never put the password in a command-line argument.
- Compose uses SQLite `/app/data/app.db` and private media `/app/uploads`.
- The external Docker network `proxy` needs a configured HTTPS reverse proxy and valid
  TLS certificate. The app has no public host port.
- Configure a 51 MiB proxy upload limit, request timeouts, per-IP login/upload limits,
  and HSTS after verifying HTTPS. Monitor disk capacity and enforce storage quotas
  appropriate to the expected user count. The bounded upload parser and persisted
  per-account login throttle do not replace proxy abuse controls.

Use one app deployment on a local persistent SQLite volume. Multiple hosts require a
different database/storage architecture. Back up SQLite consistently (stop writes or use
SQLite's backup API), along with uploads. Encrypt backups and test restoration. Define
backup retention and deletion handling in the privacy policy.

## Existing installation: first migration release

1. Record the old image digest and compose configuration. Stop writes, back up both named
   volumes and rehearse on a restored copy.
2. Verify that the live schema matches `prisma/migrations/0001_initial/migration.sql`,
   generated from the previous repository schema. Resolve drift before baselining.
3. Build with `docker compose build app`.
4. Only for an existing matching database previously created by `db push`, run:

   ```sh
   docker compose run --rm --no-deps --entrypoint node app node_modules/prisma/build/index.js migrate resolve --applied 0001_initial
   ```

5. Run `docker compose up -d app`. The entrypoint applies `0002_production` via
   `migrate deploy`. Fresh empty databases receive both migrations. Do not use
   `db push --accept-data-loss` for this upgrade.
6. Keep the same compose project name and named volumes. `app-uploads` is remounted
   at `/app/uploads`; its contents and URLs do not change. Outside Docker, move media
   out of `public/uploads` during maintenance. Remove old static/proxy upload routes.
7. Existing sessions require fresh login. Purge proxy/CDN caches of old `/uploads/`
   responses. Previously downloaded media cannot be recalled. Investigate prior exposure
   under the operator's incident process.
8. Verify anonymous media access fails, participants can read old and new media, video
   seeking works, admin changes revoke access, and help/privacy links work.
9. Check container health/logs and complete an iPhone smoke test before opening traffic.

Rollback means restoring the matching database/upload backup with the previous image
and compose configuration. Do not delete volumes to fix migration errors.

## Operational follow-up

Assign staff to review the admin report queue and respond to support. Blocking, reports
and suspension exist; pre-publication objectionable-content filtering still needs an
agreed approach, especially for media. Review data handling before sending private media
to any third-party moderation provider.

Account deletion removes affected conversations (including the other participant's
messages), account records and unreferenced uploads. File cleanup failures are logged
and need an operator retry. Backup retention is an operator decision. Orphan uploads
from interrupted sends need periodic cleanup.

Full conversation history is still fetched and the app polls while open. Load-test
with expected conversation sizes before broad rollout; add pagination and tune polling
when the workload exceeds the verified small-dataset behavior.

Dependency overrides patch PostCSS and DeepmergeTS while retaining Next.js 15 / Prisma 6.
Recheck them during framework upgrades. Runtime migrations use locked dependencies.
