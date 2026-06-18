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

Kopieren Sie `.env` und passen Sie bei Bedarf an:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="ihr-geheimer-schluessel"
```
