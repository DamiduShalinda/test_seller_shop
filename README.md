# Seller Shop

Multi-role inventory, pricing, and sales tracking.

## Workflows

- Role dashboards: `seller`, `collector`, `shop_owner`, `admin` under `/dashboard`
- Traceable lifecycle: seller → batch → shop → sale
- Barcode-only sales: shop quotes + sells by barcode (offline queue supported) via Supabase RPCs
- Payouts: sellers request payout; admin approves and marks paid
- Discounts: sellers request; admin accepts/rejects; pending requests auto-reject after 2 days
- Returns/withdrawals: sellers request return of unsold items; admin approves and completes
- Disputes: sellers can open disputes; admin resolves/rejects

## UI

- Tailwind + shadcn/ui theme (New York / Neutral)
- Role-aware sidebar navigation under `/dashboard`

## Admin bootstrap

The first admin can be assigned using the `admin-set-role` Edge Function with a one-time `BOOTSTRAP_SECRET` set in Supabase Edge Function secrets. After at least one admin exists, only admins can assign roles.

## Run locally

1. Create a Supabase project: https://database.new
2. Create `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   App runs at http://localhost:3000
