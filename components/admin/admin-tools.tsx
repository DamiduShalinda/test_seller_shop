"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/form/loading-button";

type Role = "seller" | "collector" | "shop_owner" | "admin";

type PendingDiscountRow = {
  id: string;
  batch_id: string;
  discount_price: number;
  item_limit: number | null;
};

type PayoutRow = {
  id: string;
  seller_id: string;
  amount: number;
  status: "requested" | "approved";
};

type ReturnRequestRow = {
  id: string;
  seller_id: string;
  batch_id: string;
  requested_quantity: number;
  status: "requested" | "approved";
};

type RejectedSaleEventRow = {
  id: string;
  shop_id: string;
  barcode: string;
  reason: string | null;
};

type DisputeRow = {
  id: string;
  created_by: string;
  role: Role;
  entity: string;
  entity_id: string;
  message: string;
};

export type AdminToolsSection =
  | "all"
  | "users"
  | "inventory"
  | "workflows"
  | "adjustments"
  | "reviews";

export function AdminTools({ section = "all" }: { section?: AdminToolsSection }) {
  const supabase = useMemo(() => createClient(), []);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const showUsers = section === "all" || section === "users";
  const showWorkflows = section === "all" || section === "workflows";
  const showAdjustments = section === "all" || section === "adjustments";
  const showReviews = section === "all" || section === "reviews";
  const showRefresh = section === "all" || section === "workflows" || section === "reviews";

  const [setRoleUserId, setSetRoleUserId] = useState("");
  const [setRole, setSetRole] = useState<Role>("seller");
  const [setRoleName, setSetRoleName] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [setRoleResult, setSetRoleResult] = useState<string | null>(null);

  const [pendingDiscounts, setPendingDiscounts] = useState<PendingDiscountRow[]>(
    [],
  );
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequestRow[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<RejectedSaleEventRow[]>([]);
  const [adminOpsStatus, setAdminOpsStatus] = useState<string | null>(null);
  const [openDisputes, setOpenDisputes] = useState<DisputeRow[]>([]);
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [batchInfoById, setBatchInfoById] = useState<
    Record<string, { productName: string; sellerName: string }>
  >({});

  const [slowMovingBatchId, setSlowMovingBatchId] = useState("");
  const [slowMovingValue, setSlowMovingValue] = useState(false);
  const [slowMovingResult, setSlowMovingResult] = useState<string | null>(null);

  const [commissionSellerId, setCommissionSellerId] = useState("");
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [commissionValue, setCommissionValue] = useState("");
  const [commissionResult, setCommissionResult] = useState<string | null>(null);

  const [overrideBatchId, setOverrideBatchId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideResult, setOverrideResult] = useState<string | null>(null);

  const [adjustBatchId, setAdjustBatchId] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustResult, setAdjustResult] = useState<string | null>(null);

  const refreshWorkflows = useCallback(async () => {
    setAdminOpsStatus(null);
    const [{ data: discounts }, { data: p }, { data: r }, { data: e }, { data: d }] =
      await Promise.all([
        supabase
          .from("discounts")
          .select("id, batch_id, discount_price, item_limit, created_at, expires_at, status")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("payouts")
          .select("id, seller_id, amount, status, created_at")
          .in("status", ["requested", "approved"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("return_requests")
          .select("id, seller_id, batch_id, requested_quantity, status, created_at")
          .in("status", ["requested", "approved"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("sale_events")
          .select("id, shop_id, barcode, sold_price, occurred_at, status, reason")
          .eq("status", "rejected")
          .order("occurred_at", { ascending: false })
          .limit(50),
        supabase
          .from("disputes")
          .select("id, created_by, role, entity, entity_id, message, status, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    setPendingDiscounts((discounts ?? []) as PendingDiscountRow[]);
    setPayouts((p ?? []) as PayoutRow[]);
    setReturnRequests((r ?? []) as ReturnRequestRow[]);
    setRejectedEvents((e ?? []) as RejectedSaleEventRow[]);
    setOpenDisputes((d ?? []) as DisputeRow[]);

    const userIds = Array.from(
      new Set(
        [
          ...(p ?? []).map((row) => row.seller_id),
          ...(r ?? []).map((row) => row.seller_id),
          ...(e ?? []).map((row) => row.shop_id),
          ...(d ?? []).map((row) => row.created_by),
        ].filter(Boolean),
      ),
    );

    const batchIds = Array.from(
      new Set(
        [
          ...(discounts ?? []).map((row) => row.batch_id),
          ...(r ?? []).map((row) => row.batch_id),
        ].filter(Boolean),
      ),
    );

    if (userIds.length) {
      const [admins, sellers, collectors, shops] = await Promise.all([
        supabase.from("admins").select("id, name").in("id", userIds),
        supabase.from("sellers").select("id, name").in("id", userIds),
        supabase.from("collectors").select("id, name").in("id", userIds),
        supabase.from("shops").select("id, name").in("id", userIds),
      ]);

      const map: Record<string, string> = {};
      for (const row of admins.data ?? []) map[row.id] = row.name;
      for (const row of sellers.data ?? []) map[row.id] = map[row.id] ?? row.name;
      for (const row of collectors.data ?? []) map[row.id] = map[row.id] ?? row.name;
      for (const row of shops.data ?? []) map[row.id] = map[row.id] ?? row.name;
      setNameByUserId(map);
    } else {
      setNameByUserId({});
    }

    if (batchIds.length) {
      const { data: batches } = await supabase
        .from("batches")
        .select("id, products(name), sellers(name)")
        .in("id", batchIds);

      const map: Record<string, { productName: string; sellerName: string }> = {};
      for (const row of (batches ?? []) as Array<{
        id: string;
        products: { name: string } | Array<{ name: string }> | null;
        sellers: { name: string } | Array<{ name: string }> | null;
      }>) {
        const product = Array.isArray(row.products) ? row.products[0] : row.products;
        const seller = Array.isArray(row.sellers) ? row.sellers[0] : row.sellers;
        map[row.id] = { productName: product?.name ?? "", sellerName: seller?.name ?? "" };
      }
      setBatchInfoById(map);
    } else {
      setBatchInfoById({});
    }
  }, [supabase]);

  async function run(key: string, fn: () => Promise<void>) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  }

  async function decideDiscount(id: string, status: "accepted" | "rejected") {
    setAdminOpsStatus(null);
    const { error } = await supabase.from("discounts").update({ status }).eq("id", id);
    if (error) {
      setAdminOpsStatus(error.message);
      return;
    }
    await refreshWorkflows();
  }

  async function decidePayout(id: string, status: "approved" | "rejected" | "paid") {
    setAdminOpsStatus(null);
    const { error } = await supabase.rpc("rpc_admin_decide_payout", {
      p_payout_id: id,
      p_status: status,
      p_note: null,
    });
    if (error) {
      setAdminOpsStatus(error.message);
      return;
    }
    await refreshWorkflows();
  }

  async function decideReturn(id: string, status: "approved" | "rejected") {
    setAdminOpsStatus(null);
    const { error } = await supabase.rpc("rpc_admin_decide_return", {
      p_request_id: id,
      p_status: status,
      p_admin_note: null,
    });
    if (error) {
      setAdminOpsStatus(error.message);
      return;
    }
    await refreshWorkflows();
  }

  async function completeReturn(id: string) {
    setAdminOpsStatus(null);
    const { error } = await supabase.rpc("rpc_admin_complete_return", {
      p_request_id: id,
    });
    if (error) {
      setAdminOpsStatus(error.message);
      return;
    }
    await refreshWorkflows();
  }

  async function runDiscountExpiryJob() {
    setAdminOpsStatus(null);
    const { error } = await supabase.rpc("rpc_admin_run_discount_expiry");
    if (error) setAdminOpsStatus(error.message);
    else setAdminOpsStatus("Discount expiry job executed");
    await refreshWorkflows();
  }

  async function runNightlyNotifications() {
    setAdminOpsStatus(null);
    const { data, error } = await supabase.rpc("rpc_admin_generate_nightly_notifications");
    if (error) setAdminOpsStatus(error.message);
    else setAdminOpsStatus(`Generated notifications: ${data ?? 0}`);
  }

  async function setCommission() {
    setCommissionResult(null);
    if (!commissionSellerId.trim()) {
      setCommissionResult("Missing seller_id");
      return;
    }
    const value = Number(commissionValue);
    if (!Number.isFinite(value) || value < 0) {
      setCommissionResult("Invalid value");
      return;
    }
    const { error } = await supabase.from("commissions").insert({
      seller_id: commissionSellerId.trim(),
      type: commissionType,
      value,
      active: true,
    });
    if (error) setCommissionResult(error.message);
    else setCommissionResult("Commission set");
  }

  async function overrideBatchPrice() {
    setOverrideResult(null);
    const price = Number(overridePrice);
    if (!overrideBatchId.trim() || !overrideReason.trim()) {
      setOverrideResult("Missing batch_id or reason");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setOverrideResult("Invalid price");
      return;
    }
    const { error } = await supabase.rpc("rpc_admin_override_batch_price", {
      p_batch_id: overrideBatchId.trim(),
      p_new_base_price: price,
      p_reason: overrideReason.trim(),
    });
    if (error) setOverrideResult(error.message);
    else setOverrideResult("Price overridden");
  }

  async function adjustBatchQuantity() {
    setAdjustResult(null);
    const qty = Number.parseInt(adjustQuantity, 10);
    if (!adjustBatchId.trim() || !adjustReason.trim()) {
      setAdjustResult("Missing batch_id or reason");
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setAdjustResult("Invalid quantity");
      return;
    }
    const { error } = await supabase.rpc("rpc_admin_adjust_batch_quantity", {
      p_batch_id: adjustBatchId.trim(),
      p_new_quantity: qty,
      p_reason: adjustReason.trim(),
    });
    if (error) setAdjustResult(error.message);
    else setAdjustResult("Quantity adjusted");
  }

  async function decideDispute(id: string, status: "resolved" | "rejected") {
    setAdminOpsStatus(null);
    const { error } = await supabase.from("disputes").update({ status }).eq("id", id);
    if (error) setAdminOpsStatus(error.message);
    await refreshWorkflows();
  }

  async function setSlowMoving() {
    setSlowMovingResult(null);
    if (!slowMovingBatchId.trim()) {
      setSlowMovingResult("Missing batch_id");
      return;
    }
    const { error } = await supabase.rpc("rpc_admin_set_slow_moving", {
      p_batch_id: slowMovingBatchId.trim(),
      p_slow_moving: slowMovingValue,
    });
    if (error) setSlowMovingResult(error.message);
    else setSlowMovingResult("Updated");
  }

  useEffect(() => {
    if (!showWorkflows && !showReviews) return;
    refreshWorkflows().catch(() => {});
  }, [refreshWorkflows, showReviews, showWorkflows]);

  async function callAdminSetRole() {
    setSetRoleResult(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSetRoleResult("Not logged in");
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-set-role`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (bootstrapSecret.trim()) {
      headers["x-bootstrap-secret"] = bootstrapSecret.trim();
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: setRoleUserId.trim(),
        role: setRole,
        name: setRoleName.trim() || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setSetRoleResult(res.ok ? JSON.stringify(json) : JSON.stringify(json));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {showUsers ? (
            <ResponsiveFormDrawer
              title="Set user role"
              description="Assign a role and create the corresponding profile row."
              trigger={<Button>Set role</Button>}
            >
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="user_id">User id</Label>
                  <Input
                    id="user_id"
                    value={setRoleUserId}
                    onChange={(e) => setSetRoleUserId(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="Paste user id"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={setRole}
                    onChange={(e) => setSetRole(e.target.value as Role)}
                    className="border rounded px-3 py-2 bg-background"
                  >
                    <option value="seller">seller</option>
                    <option value="collector">collector</option>
                    <option value="shop_owner">shop_owner</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    value={setRoleName}
                    onChange={(e) => setSetRoleName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bootstrap">
                    Bootstrap secret (only for first admin)
                  </Label>
                  <Input
                    id="bootstrap"
                    value={bootstrapSecret}
                    onChange={(e) => setBootstrapSecret(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <LoadingButton
                  loading={busyKey === "setRole"}
                  onClick={() => run("setRole", callAdminSetRole)}
                  className="w-fit"
                >
                  Set role
                </LoadingButton>
                {setRoleResult ? (
                  <pre className="text-xs font-mono p-3 rounded border bg-background overflow-auto max-h-40">
                    {setRoleResult}
                  </pre>
                ) : null}
              </div>
            </ResponsiveFormDrawer>
          ) : null}

          {showRefresh ? (
            <Button
              variant="outline"
              onClick={() => run("refresh", refreshWorkflows)}
              disabled={busyKey === "refresh"}
            >
              Refresh
            </Button>
          ) : null}
        </div>
        {showRefresh && adminOpsStatus ? (
          <div className="text-sm text-muted-foreground">{adminOpsStatus}</div>
        ) : null}
      </section>

      {showWorkflows ? (
        <section className="rounded border p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Workflow controls</h2>
            <div className="flex flex-wrap gap-2">
              <LoadingButton
                loading={busyKey === "discountExpiry"}
                onClick={() => run("discountExpiry", runDiscountExpiryJob)}
                variant="outline"
              >
                Run discount expiry job
              </LoadingButton>
              <LoadingButton
                loading={busyKey === "nightly"}
                onClick={() => run("nightly", runNightlyNotifications)}
                variant="outline"
              >
                Generate nightly notifications
              </LoadingButton>
            </div>
          </div>
        </section>
      ) : null}

      {showAdjustments ? (
        <section className="rounded border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Admin adjustments</h2>
          <div className="flex flex-wrap gap-2">
          <ResponsiveFormDrawer
            title="Slow-moving batch"
            description="Flag a batch for reporting/alerts."
            trigger={<Button variant="outline">Slow-moving</Button>}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="slow_batch">Batch reference</Label>
                <Input
                  id="slow_batch"
                  value={slowMovingBatchId}
                  onChange={(e) => setSlowMovingBatchId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={slowMovingValue}
                  onCheckedChange={(v) => setSlowMovingValue(Boolean(v))}
                />
                Mark as slow-moving
              </label>
              <LoadingButton
                loading={busyKey === "slowMoving"}
                onClick={() => run("slowMoving", setSlowMoving)}
                variant="outline"
                className="w-fit"
              >
                Update
              </LoadingButton>
              {slowMovingResult ? (
                <div className="text-sm text-muted-foreground">{slowMovingResult}</div>
              ) : null}
            </div>
          </ResponsiveFormDrawer>

          <ResponsiveFormDrawer
            title="Set commission"
            description="Create an active commission rule for a seller."
            trigger={<Button variant="outline">Commission</Button>}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="commission_seller">Seller id</Label>
                <Input
                  id="commission_seller"
                  value={commissionSellerId}
                  onChange={(e) => setCommissionSellerId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commission_type">Type</Label>
                <select
                  id="commission_type"
                  value={commissionType}
                  onChange={(e) =>
                    setCommissionType(e.target.value as "percentage" | "fixed")
                  }
                  className="border rounded px-3 py-2 bg-background"
                >
                  <option value="percentage">percentage</option>
                  <option value="fixed">fixed</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commission_value">Value</Label>
                <Input
                  id="commission_value"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  placeholder={commissionType === "percentage" ? "e.g. 10" : "e.g. 5.00"}
                />
              </div>
              <LoadingButton
                loading={busyKey === "commission"}
                onClick={() => run("commission", setCommission)}
                variant="outline"
                className="w-fit"
              >
                Set commission
              </LoadingButton>
              {commissionResult ? (
                <div className="text-sm text-muted-foreground">{commissionResult}</div>
              ) : null}
            </div>
          </ResponsiveFormDrawer>

          <ResponsiveFormDrawer
            title="Override batch price"
            description="Audit-logged price override (admin-only)."
            trigger={<Button variant="outline">Override price</Button>}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="override_batch">Batch reference</Label>
                <Input
                  id="override_batch"
                  value={overrideBatchId}
                  onChange={(e) => setOverrideBatchId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="override_price">New base price</Label>
                <Input
                  id="override_price"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  placeholder="e.g. 99.99"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="override_reason">Reason</Label>
                <Input
                  id="override_reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
              <LoadingButton
                loading={busyKey === "override"}
                onClick={() => run("override", overrideBatchPrice)}
                variant="outline"
                className="w-fit"
              >
                Override price
              </LoadingButton>
              {overrideResult ? (
                <div className="text-sm text-muted-foreground">{overrideResult}</div>
              ) : null}
            </div>
          </ResponsiveFormDrawer>

          <ResponsiveFormDrawer
            title="Adjust batch quantity"
            description="Audit-logged quantity adjustment."
            trigger={<Button variant="outline">Adjust quantity</Button>}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="adjust_batch">Batch reference</Label>
                <Input
                  id="adjust_batch"
                  value={adjustBatchId}
                  onChange={(e) => setAdjustBatchId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adjust_qty">New quantity</Label>
                <Input
                  id="adjust_qty"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adjust_reason">Reason</Label>
                <Input
                  id="adjust_reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
              <LoadingButton
                loading={busyKey === "adjustQty"}
                onClick={() => run("adjustQty", adjustBatchQuantity)}
                variant="outline"
                className="w-fit"
              >
                Adjust quantity
              </LoadingButton>
              {adjustResult ? (
                <div className="text-sm text-muted-foreground">{adjustResult}</div>
              ) : null}
            </div>
          </ResponsiveFormDrawer>
          </div>
        </section>
      ) : null}

      {showWorkflows ? (
        <section className="rounded border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Pending discounts</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Price</th>
                <th className="p-3">Limit</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingDiscounts.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">
                    {batchInfoById[d.batch_id]?.productName || "-"}
                  </td>
                  <td className="p-3">
                    {batchInfoById[d.batch_id]?.sellerName || "-"}
                  </td>
                  <td className="p-3">{Number(d.discount_price).toFixed(2)}</td>
                  <td className="p-3">{d.item_limit ?? "-"}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => decideDiscount(d.id, "accepted")}
                      className="px-2 py-1 rounded border text-xs"
                      disabled={Boolean(busyKey)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => decideDiscount(d.id, "rejected")}
                      className="px-2 py-1 rounded border text-xs"
                      disabled={Boolean(busyKey)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDiscounts.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No pending discounts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}

      {showWorkflows ? (
        <section className="rounded border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Payout approvals</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Seller</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{nameByUserId[p.seller_id] ?? "-"}</td>
                  <td className="p-3">{Number(p.amount).toFixed(2)}</td>
                  <td className="p-3 font-mono">{p.status}</td>
                  <td className="p-3 flex gap-2">
                    {p.status === "requested" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decidePayout(p.id, "approved")}
                          className="px-2 py-1 rounded border text-xs"
                          disabled={Boolean(busyKey)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decidePayout(p.id, "rejected")}
                          className="px-2 py-1 rounded border text-xs"
                          disabled={Boolean(busyKey)}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => decidePayout(p.id, "paid")}
                        className="px-2 py-1 rounded border text-xs"
                        disabled={Boolean(busyKey)}
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={4}>
                    No payouts needing action.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}

      {showWorkflows ? (
        <section className="rounded border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Return requests</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Seller</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnRequests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{nameByUserId[r.seller_id] ?? "-"}</td>
                  <td className="p-3">{batchInfoById[r.batch_id]?.productName || "-"}</td>
                  <td className="p-3">{r.requested_quantity}</td>
                  <td className="p-3 font-mono">{r.status}</td>
                  <td className="p-3 flex gap-2">
                    {r.status === "requested" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decideReturn(r.id, "approved")}
                          className="px-2 py-1 rounded border text-xs"
                          disabled={Boolean(busyKey)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decideReturn(r.id, "rejected")}
                          className="px-2 py-1 rounded border text-xs"
                          disabled={Boolean(busyKey)}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => completeReturn(r.id)}
                        className="px-2 py-1 rounded border text-xs"
                        disabled={Boolean(busyKey)}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {returnRequests.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No returns needing action.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}

      {showReviews ? (
        <section className="rounded border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Rejected sale events (review)</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Shop</th>
                <th className="p-3">Barcode</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rejectedEvents.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3">{nameByUserId[e.shop_id] ?? "-"}</td>
                  <td className="p-3 font-mono">{e.barcode}</td>
                  <td className="p-3">{e.reason ?? "-"}</td>
                </tr>
              ))}
              {rejectedEvents.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={3}>
                    No rejected events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}

      {showReviews ? (
        <section className="rounded border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Open disputes</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">From</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Message</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {openDisputes.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">
                      {nameByUserId[d.created_by] ?? "Unknown user"}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{d.role}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono">{d.entity}</div>
                  </td>
                  <td className="p-3">{d.message}</td>
                  <td className="p-3 flex gap-2">
                    <LoadingButton
                      loading={busyKey === `dispute:${d.id}`}
                      onClick={() => run(`dispute:${d.id}`, () => decideDispute(d.id, "resolved"))}
                      size="sm"
                      variant="outline"
                    >
                      Resolve
                    </LoadingButton>
                    <LoadingButton
                      loading={busyKey === `dispute:${d.id}`}
                      onClick={() => run(`dispute:${d.id}`, () => decideDispute(d.id, "rejected"))}
                      size="sm"
                      variant="outline"
                    >
                      Reject
                    </LoadingButton>
                  </td>
                </tr>
              ))}
              {openDisputes.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={4}>
                    No open disputes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}
    </div>
  );
}
