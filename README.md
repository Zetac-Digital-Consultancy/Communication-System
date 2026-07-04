# Kommunikationsplattform

Eine professionelle deutsche Messaging-SaaS-Plattform für private Kommunikation zwischen Kunde und Geschäftspartner.

## Funktionen

- **Anmeldung** – Sichere Authentifizierung mit E-Mail und Passwort
- **Unterhaltungen** – Sidebar mit allen Gesprächen
- **Benachrichtigungen** – Echtzeit-Benachrichtigungen bei neuen Nachrichten, Bildern und Videos
- **Nachrichten** – Text, Bilder und Videos senden und empfangen
- **Deutsche Oberfläche** – Vollständig auf Deutsch

## Schnellstart

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000) im Browser.

## Demo-Zugangsdaten

| Rolle   | E-Mail               | Passwort  |
|---------|----------------------|-----------|
| Kunde   | kunde@beispiel.de    | demo1234  |
| Partner | partner@beispiel.de  | demo1234  |

## Technologie

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- iron-session (Authentifizierung)

## Umgebungsvariablen

Kopieren Sie `.env.example` nach `.env` und passen Sie die Werte an:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="ihr-geheimer-schluessel"   # mindestens 32 Zeichen
```

## Deployment mit Docker

Voraussetzungen: Docker und Docker Compose auf dem Linux-Host.

```bash
# 1. .env anlegen
cp .env.example .env
# SESSION_SECRET generieren und in .env eintragen:
openssl rand -base64 48

# 2. Bauen und starten
docker compose up -d --build
```

Die App läuft danach auf Port 3000. Beim Start führt der Container
automatisch `prisma db push` aus; mit `SEED_DEMO_DATA=true` in der `.env`
werden zusätzlich die Demo-Benutzer angelegt.

Persistente Daten liegen in zwei benannten Volumes:

| Volume        | Pfad im Container      | Inhalt              |
|---------------|------------------------|---------------------|
| `app-data`    | `/app/data`            | SQLite-Datenbank    |
| `app-uploads` | `/app/public/uploads`  | Hochgeladene Dateien|

Hinter einem HTTPS-Reverse-Proxy (z. B. nginx, Caddy, Traefik) sollte
`COOKIE_SECURE=true` gesetzt werden.
