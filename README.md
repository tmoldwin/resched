# resched

A cleaner when2meet-style group scheduler with drag-to-select availability, mobile-friendly grids, and instant overlap heatmaps.

## Stack

- Next.js (App Router)
- Neon Postgres + Drizzle ORM
- Vercel (free hosting)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a free Postgres database at [Neon](https://neon.tech).

3. Copy env file and add your connection string:

```bash
cp .env.example .env.local
```

4. Push the schema:

```bash
npm run db:push
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (free)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial resched app"
gh repo create resched --public --source=. --push
```

### 2. Deploy on Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variable `DATABASE_URL` from Neon
3. Deploy

After deploy, run `npm run db:push` locally once (or use Drizzle Studio) so tables exist in production.

## Features

- Create events with date range, daily hours, and 15/30/60 minute slots
- Share a link — no accounts required
- Drag or tap to mark availability (desktop + mobile)
- Group heatmap shows best overlapping times
- Optional event password
- Edit your response later via browser session
