import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
if (!SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

// Service-role client for seeding (Auth admin + bypass RLS).
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getOrCreateUser({ email, password }) {
  const createRes = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createRes.data?.user) return createRes.data.user;
  if (!createRes.error) throw new Error("Failed to create user");

  // If it already exists, find it.
  const listRes = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listRes.error) throw listRes.error;

  const existing = listRes.data.users.find((u) => u.email === email);
  if (!existing) throw createRes.error;
  return existing;
}

async function setRole(userId, role, name) {
  const updateRes = await service.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  if (updateRes.error) throw updateRes.error;

  const { error: usersErr } = await service
    .from("users")
    .upsert({ id: userId, role }, { onConflict: "id" });
  if (usersErr) throw usersErr;

  if (role === "admin") {
    const { error } = await service
      .from("admins")
      .upsert({ id: userId, name }, { onConflict: "id" });
    if (error) throw error;
  }

  if (role === "seller") {
    const { error } = await service
      .from("sellers")
      .upsert({ id: userId, name }, { onConflict: "id" });
    if (error) throw error;
  }

  if (role === "collector") {
    const { error } = await service
      .from("collectors")
      .upsert({ id: userId, name }, { onConflict: "id" });
    if (error) throw error;
  }

  if (role === "shop_owner") {
    const { error } = await service
      .from("shops")
      .upsert({ id: userId, name, offline_enabled: true }, { onConflict: "id" });
    if (error) throw error;
  }
}

function randomBarcode(prefix, n) {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

async function main() {
  const users = [
    {
      label: "Admin",
      email: "admin.mock@seller-shop.local",
      password: "Password123!",
      role: "admin",
      name: "Mock Admin",
    },
    {
      label: "Seller",
      email: "seller.mock@seller-shop.local",
      password: "Password123!",
      role: "seller",
      name: "Mock Seller",
    },
    {
      label: "Collector",
      email: "collector.mock@seller-shop.local",
      password: "Password123!",
      role: "collector",
      name: "Mock Collector",
    },
    {
      label: "Shop",
      email: "shop.mock@seller-shop.local",
      password: "Password123!",
      role: "shop_owner",
      name: "Mock Shop",
    },
  ];

  const created = [];
  for (const u of users) {
    const authUser = await getOrCreateUser({ email: u.email, password: u.password });
    await setRole(authUser.id, u.role, u.name);
    created.push({ ...u, id: authUser.id });
  }

  const adminId = created.find((u) => u.role === "admin").id;
  const sellerId = created.find((u) => u.role === "seller").id;
  const collectorId = created.find((u) => u.role === "collector").id;
  const shopId = created.find((u) => u.role === "shop_owner").id;

  // Seed product
  const { data: productRows, error: productErr } = await service
    .from("products")
    .insert({
      name: "Mock Cinnamon Tea",
      description: "Seeded product for demo workflows",
    })
    .select("id")
    .limit(1);
  if (productErr) throw productErr;
  const productId = productRows[0].id;

  // Seed batch
  const { data: batchRows, error: batchErr } = await service
    .from("batches")
    .insert({
      seller_id: sellerId,
      product_id: productId,
      base_price: 100.0,
      quantity: 5,
      status: "created",
    })
    .select("id")
    .limit(1);
  if (batchErr) throw batchErr;
  const batchId = batchRows[0].id;

  // Commission for seller (10%)
  await service.from("commissions").insert({
    seller_id: sellerId,
    type: "percentage",
    value: 10,
    active: true,
  });

  // Discount (accepted) for batch
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: discountRows, error: discountErr } = await service
    .from("discounts")
    .insert({
      batch_id: batchId,
      item_limit: 2,
      discount_price: 90.0,
      status: "accepted",
      expires_at: expiresAt,
    })
    .select("id")
    .limit(1);
  if (discountErr) throw discountErr;
  const discountId = discountRows[0].id;

  // Create items (barcodes)
  const barcodes = Array.from({ length: 5 }, (_, i) => randomBarcode("MOCK", i + 1));
  const { data: itemRows, error: itemsErr } = await service
    .from("items")
    .insert(
      barcodes.map((barcode) => ({
        batch_id: batchId,
        barcode,
        status: "created",
      })),
    )
    .select("id, barcode")
    // Some deployments may not have `items.created_at`; `barcode` is always present.
    .order("barcode", { ascending: true });
  if (itemsErr) throw itemsErr;

  // Collection workflow: insert collection -> batch becomes collecting; then confirm -> batch becomes collected
  const { data: colRows, error: colErr } = await service
    .from("collections")
    .insert({
      batch_id: batchId,
      collector_id: collectorId,
      collected_quantity: 5,
      seller_confirmed: false,
      handed_to_shop: true,
      handover_proof: "mock-proof-001",
      handed_to_shop_at: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  if (colErr) throw colErr;
  const collectionId = colRows[0].id;

  await service
    .from("collections")
    .update({ seller_confirmed: true })
    .eq("id", collectionId);

  // Stock items into shop: created -> in_transit -> in_shop
  for (const it of itemRows) {
    await service.from("items").update({ status: "in_transit" }).eq("id", it.id);
    await service
      .from("items")
      .update({ status: "in_shop", current_shop_id: shopId })
      .eq("id", it.id);
  }
  await service.from("batches").update({ status: "in_shop" }).eq("id", batchId);

  // Create one sale directly (service role), then update item + batch + wallet/ledger
  const soldItemId = itemRows[0].id;
  const { data: saleRows, error: saleErr } = await service
    .from("sales")
    .insert({
      item_id: soldItemId,
      shop_id: shopId,
      sold_price: 90.0,
      sold_at: new Date().toISOString(),
      discount_id: discountId,
    })
    .select("id")
    .limit(1);
  if (saleErr) throw saleErr;
  const saleId = saleRows[0].id;

  await service.from("items").update({ status: "sold" }).eq("id", soldItemId);
  await service
    .from("batches")
    .update({ status: "partially_sold" })
    .eq("id", batchId);

  // Wallet credit: seller gets 90 - 10% = 81.00
  await service.from("wallets").upsert(
    { seller_id: sellerId, balance: 81.0 },
    { onConflict: "seller_id" },
  );
  await service
    .from("wallet_transactions")
    .insert({ seller_id: sellerId, sale_id: saleId, amount: 81.0 });

  // Payout request
  await service
    .from("payouts")
    .insert({ seller_id: sellerId, amount: 20.0, status: "requested" });

  // Return request (for remaining in_shop items)
  await service.from("return_requests").insert({
    seller_id: sellerId,
    batch_id: batchId,
    requested_quantity: 1,
    reason: "mock return request",
    status: "requested",
  });

  // Dispute
  await service.from("disputes").insert({
    created_by: sellerId,
    role: "seller",
    entity: "batches",
    entity_id: batchId,
    message: "Mock dispute: please review batch status/pricing",
    status: "open",
  });

  // Notification
  await service.from("notifications").insert({
    user_id: sellerId,
    type: "nightly_earnings",
    title: "Mock nightly earnings",
    body: "You earned 81.00 today (mock).",
  });

  // Minimal audit for seed run
  await service.from("audit_logs").insert({
    entity: "seed",
    entity_id: batchId,
    action: "seed_mock_data",
    before: null,
    after: { users: created.map((u) => ({ id: u.id, role: u.role, email: u.email })) },
    actor_id: adminId,
  });

  console.log("Seed complete:");
  console.table(created.map(({ label, email, role, id }) => ({ label, email, role, id })));
  console.log({ productId, batchId, collectionId, saleId, barcodes });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
