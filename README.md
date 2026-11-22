# ShareHub

ShareHub is a hyperlocal peer-to-peer rental marketplace. Owners can list items and neighbours can discover them, see the daily rent and security deposit, and contact the owner. Phase 1 does not process bookings or payments.

## Local development

Requirements: Node.js supported by Vite 8 and npm.

1. Install dependencies with `npm install`.
2. Create `.env.local` with `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or the legacy `VITE_SUPABASE_ANON_KEY`.
3. Start the app with `npm run dev` (Vite’s default port is 5173).

The public key is intended for browser use and must be protected by database RLS. Never put a service-role key or Supabase secret key in a Vite environment variable.

## Supabase

The app uses the existing ShareHub Supabase project. Its core schema is versioned under `supabase/migrations/`; the current database verification command is `npm run verify:supabase`. That script checks public Data API access to the application categories, active listings, and listing image metadata without printing credentials.

The `listing-images` bucket must be created through Supabase Storage with public reads, a 5 MB size limit, and JPEG, PNG, and WebP MIME types before image uploads can succeed. See [supabase/STORAGE_SETUP.md](supabase/STORAGE_SETUP.md). Do not edit Supabase’s internal Storage tables with SQL.

## Quality checks

- `npm run lint` — ESLint
- `npm run build` — TypeScript project build and Vite production build
- `npm run test` — Vitest and React Testing Library unit tests
- `npm run test:e2e` — Playwright public-flow, route-guard, and responsive smoke tests

Playwright screenshots and traces are written to the ignored `test-results/` directory. The end-to-end suite does not create users or persistent marketplace data. Registration, email confirmation, authenticated listing uploads, and two-account messaging require authorized test accounts and are not automated against production.

## Application source

- `src/pages/` — marketplace, account, messaging, and authentication routes
- `src/services/` — typed Supabase data access
- `src/auth/` — session provider, route protection, and validation
- `supabase/` — versioned schema, seed reference categories, and schema checks
- `public/assets/sharehub-logo.png` — original ShareHub brand asset

Personal project references and handwritten workflow documents under `references/` are excluded from source control. The original logo used by the application is kept under `public/assets/`.
