# Bhargavi's NEET Tracker — Setup Guide

A Physics, Chemistry + Biology prep tracker for NEET. Physics and Chemistry have per-chapter counters for
modules completed, revision passes ("race"), NEET PYQs solved, and JEE PYQs
solved; Biology has an NCERT-revision counter. Data lives in Supabase (Postgres), so it survives closing the
browser, switching devices, or a full new session — as long as it's the
same Supabase project.

## 1. Create your Supabase project

1. Go to https://supabase.com and sign up free (no card needed).
2. Click "New project". Pick any name/region, set a database password
   (you won't need it day-to-day — Supabase stores it), and wait ~2 min
   for it to spin up.
3. In the left sidebar go to **SQL Editor -> New query**, paste the
   entire contents of `supabase/schema.sql` from this project, and click
   **Run**. This creates the `chapters` table.
4. Go to **Project Settings -> API**. Copy:
   - **Project URL**
   - **anon public** key

### Existing Supabase project: add the Biology field

If you already ran an older version of this tracker, open **SQL Editor -> New query**
and run this once before deploying the Biology update:

```sql
alter table chapters
  add column if not exists ncert_revised_count int default 0;
```

New projects do not need this separate step: the latest `supabase/schema.sql`
already creates the column.

## 2. Configure the app

1. In this project folder, copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and paste in your Project URL and anon key.

## 3. Run it locally

```
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Log in with:
- Username: `Bhargavi`
- Password: `Ashish`

The chapter list auto-seeds itself into Supabase the first time it loads.

## 4. Deploy it for free (so Bhargavi can open it from her phone)

**Easiest option: Vercel**
1. Push this folder to a GitHub repo (private repo is fine — recommended,
   since the code contains the hardcoded login).
2. Go to https://vercel.com, sign in with GitHub, "Add New Project",
   import the repo.
3. In the Vercel project's **Settings -> Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values as your `.env`)
4. Deploy. Vercel gives you a free `https://your-app.vercel.app` URL.

Netlify works the same way if you prefer it.

## 5. Security notes (read this)

- The login screen checks a hardcoded username/password
  (`Bhargavi` / `Ashish`) entirely in the browser. It's a **casual gate**,
  not real authentication — good enough to keep random visitors out if
  they don't know the URL and credentials, but not something to rely on
  for sensitive data.
- Because there's no real Supabase Auth session, the database's Row Level
  Security policy is set to "allow all" for the `chapters` table. That
  means anyone who inspects your deployed site's JS bundle could extract
  your Supabase URL + anon key and read/write the table directly,
  bypassing the login screen entirely. For a private study tracker this
  is a reasonable tradeoff, but don't reuse this pattern for anything
  more sensitive.
- **If you want real security later:** swap the hardcoded login for
  actual Supabase Auth (email/password or magic link), and change the
  RLS policy to check `auth.uid()` instead of `using (true)`. Happy to
  build that version if you want it — it's maybe 30 extra minutes of work.

## Project structure

```
neet-tracker/
├── supabase/schema.sql       — run once in Supabase SQL editor
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js — Supabase connection
│   │   └── chapterData.js    — chapter lists, constants, helpers
│   ├── components/
│   │   ├── Login.jsx         — hardcoded username/password gate
│   │   └── NeetTracker.jsx   — main app (dashboards, chapters, counters)
│   └── App.jsx                — auth routing
├── .env.example
└── package.json
```
