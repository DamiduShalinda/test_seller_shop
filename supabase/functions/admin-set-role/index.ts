import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Role = "seller" | "collector" | "shop_owner" | "admin";

type RequestBody = {
  user_id: string;
  role: Role;
  name?: string;
};

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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const BOOTSTRAP_SECRET = Deno.env.get("BOOTSTRAP_SECRET");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "missing_env" });
  }

  const bearer = getBearer(req);
  if (!bearer) return json(401, { error: "missing_bearer" });

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "invalid_token" });

  const actorId = authData.user.id;

  const { data: actorRow, error: actorRowError } = await authClient
    .from("users")
    .select("id, role")
    .eq("id", actorId)
    .maybeSingle();

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: existingAdmins, error: existingAdminsError } = await serviceClient
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (existingAdminsError) return json(500, { error: "admin_check_failed" });
  const hasAdmin = (existingAdmins?.length ?? 0) > 0;

  const bootstrapHeader = req.headers.get("x-bootstrap-secret");
  const bootstrapAllowed =
    !hasAdmin && BOOTSTRAP_SECRET && bootstrapHeader === BOOTSTRAP_SECRET;

  if (!bootstrapAllowed) {
    if (actorRowError || !actorRow) return json(403, { error: "forbidden" });
    if (actorRow.role !== "admin") return json(403, { error: "admin_only" });
  }

  let payload: RequestBody;
  try {
    payload = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (!payload?.user_id || !payload?.role) {
    return json(400, { error: "missing_fields" });
  }

  const userId = payload.user_id;
  const role = payload.role;
  const name = payload.name ?? null;

  const { data: beforeUserRow } = await serviceClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(
    userId,
    {
      app_metadata: { role },
    },
  );
  if (authUpdateError) return json(400, { error: "auth_update_failed" });

  const { error: upsertUserError } = await serviceClient.from("users").upsert(
    { id: userId, role },
    { onConflict: "id" },
  );
  if (upsertUserError) return json(400, { error: "users_upsert_failed" });

  if (role === "seller") {
    const { error } = await serviceClient
      .from("sellers")
      .upsert({ id: userId, name: name ?? "Seller" }, { onConflict: "id" });
    if (error) return json(400, { error: "seller_upsert_failed" });
  }

  if (role === "collector") {
    const { error } = await serviceClient
      .from("collectors")
      .upsert({ id: userId, name: name ?? "Collector" }, { onConflict: "id" });
    if (error) return json(400, { error: "collector_upsert_failed" });
  }

  if (role === "shop_owner") {
    const { error } = await serviceClient
      .from("shops")
      .upsert({ id: userId, name: name ?? "Shop", offline_enabled: true }, {
        onConflict: "id",
      });
    if (error) return json(400, { error: "shop_upsert_failed" });
  }

  if (role === "admin") {
    const { error } = await serviceClient
      .from("admins")
      .upsert({ id: userId, name: name ?? "Admin" }, { onConflict: "id" });
    if (error) return json(400, { error: "admin_upsert_failed" });
  }

  const { data: afterUserRow } = await serviceClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  await serviceClient.from("audit_logs").insert({
    entity: "users",
    entity_id: userId,
    action: "set_role",
    before: beforeUserRow ?? null,
    after: afterUserRow ?? null,
    actor_id: actorId,
  });

  return json(200, { ok: true, user_id: userId, role });
});
