# MAE - Make Appointments Easier

A service appointment booking platform. Users search for services (barber, nail studio, etc.), see available providers with open time slots, and book directly.

## Tech Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4 + shadcn/ui**
- **Supabase** (PostgreSQL, Auth, Realtime)
- **next-intl** (German/English)

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Database

The SQL migration is in `supabase/migrations/00001_initial_schema.sql`. Apply it to your Supabase project via the SQL editor or Supabase CLI.

## License

Private - All rights reserved.
