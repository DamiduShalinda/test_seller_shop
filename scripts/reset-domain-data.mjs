import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://injrpdlmkuuwfpvyzadw.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluanJwZGxta3V1d2Zwdnl6YWR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTY0NzI3MSwiZXhwIjoyMDgxMjIzMjcxfQ.LW9UL1hwsrBNJwQMHgbgDeaAv1YnATDRWKGaDbYXkfU";

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = [
  { name: "audit_logs", pk: "id" },
  { name: "sales", pk: "id" },
  { name: "discounts", pk: "id" },
  { name: "commissions", pk: "id" },
  { name: "payouts", pk: "id" },
  { name: "wallets", pk: "seller_id" },
  { name: "collections", pk: "id" },
  { name: "items", pk: "id" },
  { name: "batches", pk: "id" },
  { name: "products", pk: "id" },
];

async function deleteAll(table, pkColumn) {
  const filterValue = "00000000-0000-0000-0000-000000000000";
  const query = service.from(table).delete().neq(pkColumn, filterValue);

  const { error, count } = await query;
  if (error) {
    throw new Error(`Failed to clean ${table}: ${error.message}`);
  }
  console.log(`Cleared ${table}${typeof count === "number" ? ` (${count})` : ""}`);
}

async function main() {
  console.log("Starting domain data reset (user profile tables untouched)...");
  for (const { name, pk } of TABLES) {
    await deleteAll(name, pk);
  }
  console.log("Done. Sellers/collectors/shops/users remain untouched.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
