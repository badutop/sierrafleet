**Sierra Fleet / Sierra Logistics**

Fleet management app for Sierra Logistics — vehicles, drivers, campaigns, fuel, maintenance, expenses, and spare parts, built on React + Vite + Supabase.

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

Database schema, RLS policies, and Edge Functions live under `supabase/migrations/` and `supabase/functions/`. Deploy Edge Functions with `supabase functions deploy <name>`.
