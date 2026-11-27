# Echo Sector

Tactical top-down shooter built with Next.js, React, TypeScript and Canvas.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm run typecheck
npm run build
```

## Database

Set `DATABASE_URL` to a PostgreSQL connection string to enable persistent global scores. Without it, the game can still start with fallback leaderboard entries, but score submissions will not be saved persistently.

## Multiplayer hosting note

The current multiplayer hub stores rooms and connected players in server-process memory. Run the app on a persistent Node.js server for multiplayer sessions to share that state. A serverless deployment with isolated function instances needs a shared realtime store (for example Redis or PostgreSQL) before multiplayer can be relied on.

This is a Next.js server app with API routes and server-sent events; it cannot be deployed as a static GitHub Pages site.
