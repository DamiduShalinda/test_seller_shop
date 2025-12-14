# Supabase Implementation Plan (Seller Shop)

This file tracks the step-by-step implementation progress for the Supabase backend (schema hardening, RLS, triggers, RPCs, Edge Functions, and seed data) as described in `system.md`, `domain.md`, `workflows.md`, `security.md`, and `non-functional.md`.

## Progress

- [x] 1) Add RLS helpers + enable RLS on all tables
- [x] 2) Add baseline RLS policies per role/table
- [x] 3) Add immutability + “no delete” guard triggers
- [x] 4) Add offline idempotency tables (`sale_events`) + wallet ledger (`wallet_transactions`)
- [x] 5) Implement core RPCs (starting with shop sale-by-barcode ingestion)
- [x] 6) Deploy admin Edge Function for role assignment + audited actions
- [x] 7) Seed safe dummy data (catalog-level first)
- [x] 8) Verify with SQL checks (RLS, invariants, idempotency)
- [x] 9) Add lifecycle/immutability guards (items/batches/sales)
- [x] 10) Enforce pricing/discount/commission in sale RPC + add quote RPC
- [x] 11) Revoke direct writes to block manual sales
- [x] 12) Build supportive Next.js UI for all roles
- [x] 13) Implement payouts, returns, disputes UIs
- [x] 14) Add scheduled/triggered workflow jobs

## Notes / decisions log

- All production writes should flow through RPCs/Edge Functions; direct table writes are restricted by RLS.
- No hard deletes: enforced via triggers + restricted privileges.
- Barcode-only sales: `sales` inserts should happen via RPC that validates barcode + item state.
