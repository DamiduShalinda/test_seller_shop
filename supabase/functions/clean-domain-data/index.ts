import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type TableSpec = { name: string; pk: string };

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const TABLES_TO_CLEAN: TableSpec[] = [
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

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBearer(req: Request) {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function assertAdmin(supabaseUrl: string, anonKey: string, bearer: string) {
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    return { ok: false as const, error: "invalid_token" };
  }

  const actorId = data.user.id;

  const { data: actorRow, error: actorRowError } = await authClient
    .from("users")
    .select("id, role")
    .eq("id", actorId)
    .maybeSingle();

  if (actorRowError || !actorRow || actorRow.role !== "admin") {
    return { ok: false as const, error: "admin_only" };
  }

  return { ok: true as const, actorId };
}

async function cleanTables(serviceClient: ReturnType<typeof createClient>) {
  for (const { name, pk } of TABLES_TO_CLEAN) {
    const { error } = await serviceClient.from(name).delete().neq(pk, ZERO_UUID);
    if (error) throw new Error(`Failed to clean ${name}: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "missing_env" });
  }

  const bearer = getBearer(req);
  if (!bearer) return json(401, { error: "missing_bearer" });

  const adminCheck = await assertAdmin(SUPABASE_URL, SUPABASE_ANON_KEY, bearer);
  if (!adminCheck.ok) {
    const status = adminCheck.error === "invalid_token" ? 401 : 403;
    return json(status, { error: adminCheck.error });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    await cleanTables(serviceClient);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return json(500, { error: "cleanup_failed", message });
  }

  const { error: auditError } = await serviceClient.from("audit_logs").insert({
    entity: "maintenance",
    entity_id: adminCheck.actorId,
    action: "reset_domain_data",
    before: null,
    after: { tables_cleared: TABLES_TO_CLEAN.map((t) => t.name) },
    actor_id: adminCheck.actorId,
  });

  if (auditError) {
    return json(500, { error: "audit_log_failed", message: auditError.message });
  }

  return json(200, {
    ok: true,
    tables_cleared: TABLES_TO_CLEAN.map((t) => t.name),
  });
});
