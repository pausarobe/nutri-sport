# NutriSport Pro

A simple personal nutritionist web app built with Next.js App Router, TypeScript,
Tailwind CSS, and Supabase.

## What Was Reused From `NutriSportPro-4.html`

The reference file is a large single-file React app that stores data in
`localStorage`. This project keeps the useful product shape and UI language:

- compact sidebar dashboard
- client cards with initials
- client detail workspace
- editable personal info
- nutrition plan text area
- clinical/history notes

It intentionally drops the monolithic embedded CSS/JS structure and moves data to
Supabase with RLS policies.

## Project Structure

```txt
.
|-- proxy.ts
|-- supabase/
|   `-- schema.sql
|-- src/
|   |-- app/
|   |   |-- (app)/
|   |   |   |-- clients/
|   |   |   |   |-- [id]/
|   |   |   |   |   |-- edit/page.tsx
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- actions.ts
|   |   |   |   |-- new/page.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- dashboard/page.tsx
|   |   |   `-- layout.tsx
|   |   |-- (auth)/
|   |   |   `-- login/
|   |   |       |-- actions.ts
|   |   |       `-- page.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   `-- lib/
|       `-- supabase/
|-- .env.example
|-- next.config.ts
|-- package.json
|-- postcss.config.mjs
`-- tsconfig.json
```

## Data Model

The requested `clients` and `plans` tables are included. The schema improves the
model with:

- `user_id` on every table so Row Level Security can isolate each nutritionist
- `updated_at` for editable records
- richer client profile fields: sex, birth date, height, weight, sport,
  activity level, and allergies
- `client_notes` for the history/notes section
- `client_files` plus a private Supabase Storage bucket for client documents
- one current `plans` row per client via `unique (client_id)`

Run the full SQL in `supabase/schema.sql`.

If your Supabase project already exists from an earlier version of this app, run
the SQL in `supabase/migrations/20260506_add_client_profile_fields.sql` too.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project:

- Go to https://database.new
- Create a new project
- In Supabase SQL Editor, paste and run `supabase/schema.sql`
- In Authentication > Providers, make sure Email is enabled
- Disable public signups in Supabase Auth settings if you only want private access
- Create your own users manually from Authentication > Users
- If email confirmation or invite links are enabled, add
  `http://localhost:3000/auth/confirm` to the Supabase redirect URLs

3. Configure environment variables:

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

You can find both values in Supabase Project Settings > API or the Connect dialog.
Do not add service role keys to this app.

4. Run locally:

```bash
npm run dev
```

Open http://localhost:3000.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy on the free tier.

If email confirmation is enabled in Supabase, add your Vercel domain to
Authentication > URL Configuration > Redirect URLs.

## Security Notes

- Auth uses Supabase email/password.
- Routes under `/dashboard` and `/clients` are protected in `proxy.ts` and checked
  again server-side in the protected layout.
- The app uses `@supabase/ssr` cookie-based auth.
- RLS policies in `supabase/schema.sql` restrict rows and Storage objects to the
  signed-in user.
- No service role key is used or needed.
