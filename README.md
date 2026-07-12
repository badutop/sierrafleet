**Sierra Fleet / Sierra Logistics**

Fleet management app for Sierra Logistics — vehicles, drivers, campaigns, fuel, maintenance, expenses, and spare parts. Built on React + Vite + Supabase.

**Prerequisites:**

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file with your Supabase project credentials (Project Settings → API):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the app: `npm run dev`

**Backend**

- **Database & auth**: Supabase Postgres with Row Level Security. Schema and RLS policies live under `supabase/migrations/`. Accounts are admin-created only (no self-signup) — see `supabase/functions/admin-create-user`.
- **Edge Functions** (`supabase/functions/`): server-side logic such as admin user management, audit logging (`log-audit`), scheduled document-expiry alerts (`send-document-alerts`, run daily via `pg_cron`), and WhatsApp notifications (`whatsapp-notify`). Deploy with `supabase functions deploy <name>`.
- **Storage**: uploaded photos and documents (driver photos/IDs, vehicle documents, fuel receipts) go to a public Supabase Storage bucket (`uploads`) with owner-or-admin-restricted write policies.
- **WhatsApp integration**: outbound notifications go through a self-hosted [Evolution API](https://doc.evolution-api.com) instance (not a third-party SaaS) via `supabase/functions/_shared/evolution.ts`. Connection details (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`) are configured as Edge Function secrets, not hardcoded.
