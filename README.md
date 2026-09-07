# Communication

German messaging and availability app operated by **Zetac IT Solutions**.
Support: **info@zetac.de**. The native iPhone client loads the hosted web app.

Features: private text/photo/video conversations, contacts, calendars, administration,
blocking/reporting and account deletion. Notifications update while the app is open;
APNs background push is not implemented.

## Local development

Use Node 22 or newer and npm. Copy `.env.example` to `.env`, generate a unique
`SESSION_SECRET` of at least 32 characters, and set:

```dotenv
DATABASE_URL=file:./dev.db
APP_URL=http://localhost:3000
COOKIE_SECURE=false
```

```sh
npm ci
npx prisma migrate deploy
npm run dev
```

To create the first administrator, set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`
and `INITIAL_ADMIN_PASSWORD` in the local environment or untracked `.env`, then run
`npm run db:seed`. Use a unique password of at least 12 characters (maximum 72 UTF-8
bytes). Remove those setup variables afterward. The command has no defaults, creates
no example conversations and refuses to overwrite an existing administrator. Create
additional accounts through the administrator panel.

## Verification

```sh
npm run build
npm run lint
npm run typecheck
npm test
npm audit
```

Build requires `SESSION_SECRET` and `DATABASE_URL`. Tests use temporary databases,
test-only accounts, private temporary storage and a production server on loopback
port 3317. They do not connect to the live service. Build before running tests.

## Release

Read [DEPLOYMENT.md](DEPLOYMENT.md) before upgrading an existing database and
[ios/APP_STORE_RELEASE.md](ios/APP_STORE_RELEASE.md) for submission preparation.
This source tree has not been deployed or uploaded to Apple.

Stack: Next.js 15, React 19, TypeScript, Prisma 6 / SQLite, iron-session, SwiftUI / WKWebView.
