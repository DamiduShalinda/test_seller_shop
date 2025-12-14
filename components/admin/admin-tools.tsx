"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

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

export function AdminTools() {
  const supabase = useMemo(() => createClient(), []);

  const [setRoleUserId, setSetRoleUserId] = useState("");
  const [setRole, setSetRole] = useState<Role>("seller");
  const [setRoleName, setSetRoleName] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [setRoleResult, setSetRoleResult] = useState<string | null>(null);

  const [batchId, setBatchId] = useState("");
  const [barcodes, setBarcodes] = useState("");
  const [createItemsResult, setCreateItemsResult] = useState<string | null>(null);

  const [stockBarcode, setStockBarcode] = useState("");
  const [stockShopId, setStockShopId] = useState("");
  const [stockResult, setStockResult] = useState<string | null>(null);

  const [pendingDiscounts, setPendingDiscounts] = useState<PendingDiscountRow[]>(
    [],
  );
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequestRow[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<RejectedSaleEventRow[]>([]);
  const [adminOpsStatus, setAdminOpsStatus] = useState<string | null>(null);
  const [openDisputes, setOpenDisputes] = useState<DisputeRow[]>([]);

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
  }, [supabase]);

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
    refreshWorkflows().catch(() => {});
  }, [refreshWorkflows]);

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

  async function callCreateItems() {
    setCreateItemsResult(null);
    const list = barcodes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!batchId.trim() || list.length === 0) {
      setCreateItemsResult("Provide batch_id and at least one barcode");
      return;
    }
    const { data, error } = await supabase.rpc("rpc_admin_create_items", {
      p_batch_id: batchId.trim(),
      p_barcodes: list,
      p_initial_status: "created",
    });
    if (error) {
      setCreateItemsResult(error.message);
      return;
    }
    setCreateItemsResult(JSON.stringify(data));
  }

  async function callStockItem() {
    setStockResult(null);
    if (!stockBarcode.trim() || !stockShopId.trim()) {
      setStockResult("Provide barcode and shop_id");
      return;
    }
    const { data, error } = await supabase.rpc("rpc_admin_stock_item_to_shop", {
      p_barcode: stockBarcode.trim(),
      p_shop_id: stockShopId.trim(),
    });
    if (error) {
      setStockResult(error.message);
      return;
    }
    setStockResult(JSON.stringify(data));
  }

  return (
    <div className="space-y-8">
      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Set user role</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">User id</span>
            <input
              value={setRoleUserId}
              onChange={(e) => setSetRoleUserId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Role</span>
            <select
              value={setRole}
              onChange={(e) => setSetRole(e.target.value as Role)}
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="seller">seller</option>
              <option value="collector">collector</option>
              <option value="shop_owner">shop_owner</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Name (optional)</span>
            <input
              value={setRoleName}
              onChange={(e) => setSetRoleName(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">
              Bootstrap secret (only for first admin)
            </span>
            <input
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
            />
          </label>
          <button
            type="button"
            onClick={callAdminSetRole}
            className="px-4 py-2 rounded bg-foreground text-background text-sm w-fit"
          >
            Set role
          </button>
          {setRoleResult && (
            <pre className="text-xs font-mono p-3 rounded border overflow-auto">
              {setRoleResult}
            </pre>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Create item barcodes for batch</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Batch id</span>
            <input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Barcodes (one per line)</span>
            <textarea
              value={barcodes}
              onChange={(e) => setBarcodes(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm min-h-32"
            />
          </label>
          <button
            type="button"
            onClick={callCreateItems}
            className="px-4 py-2 rounded border text-sm w-fit"
          >
            Create items
          </button>
          {createItemsResult && (
            <pre className="text-xs font-mono p-3 rounded border overflow-auto">
              {createItemsResult}
            </pre>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Stock item into shop</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Barcode</span>
            <input
              value={stockBarcode}
              onChange={(e) => setStockBarcode(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Shop id</span>
            <input
              value={stockShopId}
              onChange={(e) => setStockShopId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <button
            type="button"
            onClick={callStockItem}
            className="px-4 py-2 rounded border text-sm w-fit"
          >
            Stock item
          </button>
          {stockResult && (
            <pre className="text-xs font-mono p-3 rounded border overflow-auto">
              {stockResult}
            </pre>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workflow controls</h2>
          <button
            type="button"
            onClick={() => refreshWorkflows()}
            className="px-4 py-2 rounded border text-sm"
          >
            Refresh
          </button>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={runDiscountExpiryJob}
            className="px-4 py-2 rounded border text-sm"
          >
            Run discount expiry job
          </button>
          <button
            type="button"
            onClick={runNightlyNotifications}
            className="px-4 py-2 rounded border text-sm"
          >
            Generate nightly notifications
          </button>
        </div>
        {adminOpsStatus && (
          <div className="text-sm text-foreground/70">{adminOpsStatus}</div>
        )}
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Slow-moving batches</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Batch id</span>
            <input
              value={slowMovingBatchId}
              onChange={(e) => setSlowMovingBatchId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={slowMovingValue}
              onChange={(e) => setSlowMovingValue(e.target.checked)}
            />
            Mark as slow-moving
          </label>
          <button
            type="button"
            onClick={setSlowMoving}
            className="px-4 py-2 rounded border text-sm w-fit"
          >
            Update
          </button>
          {slowMovingResult && (
            <div className="text-sm text-foreground/70">{slowMovingResult}</div>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Pending discounts</h2>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Batch</th>
                <th className="p-3">Price</th>
                <th className="p-3">Limit</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingDiscounts.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{d.batch_id}</td>
                  <td className="p-3">{Number(d.discount_price).toFixed(2)}</td>
                  <td className="p-3">{d.item_limit ?? "-"}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => decideDiscount(d.id, "accepted")}
                      className="px-2 py-1 rounded border text-xs"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => decideDiscount(d.id, "rejected")}
                      className="px-2 py-1 rounded border text-xs"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDiscounts.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={4}>
                    No pending discounts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Payout approvals</h2>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
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
                  <td className="p-3 font-mono text-xs">{p.seller_id}</td>
                  <td className="p-3">{Number(p.amount).toFixed(2)}</td>
                  <td className="p-3 font-mono">{p.status}</td>
                  <td className="p-3 flex gap-2">
                    {p.status === "requested" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decidePayout(p.id, "approved")}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decidePayout(p.id, "rejected")}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => decidePayout(p.id, "paid")}
                        className="px-2 py-1 rounded border text-xs"
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

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Return requests</h2>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Seller</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnRequests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.seller_id}</td>
                  <td className="p-3 font-mono text-xs">{r.batch_id}</td>
                  <td className="p-3">{r.requested_quantity}</td>
                  <td className="p-3 font-mono">{r.status}</td>
                  <td className="p-3 flex gap-2">
                    {r.status === "requested" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decideReturn(r.id, "approved")}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decideReturn(r.id, "rejected")}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => completeReturn(r.id)}
                        className="px-2 py-1 rounded border text-xs"
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

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Commissions</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Seller id</span>
            <input
              value={commissionSellerId}
              onChange={(e) => setCommissionSellerId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Type</span>
            <select
              value={commissionType}
              onChange={(e) =>
                setCommissionType(e.target.value as "percentage" | "fixed")
              }
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="percentage">percentage</option>
              <option value="fixed">fixed</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Value</span>
            <input
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
              placeholder={commissionType === "percentage" ? "e.g. 10" : "e.g. 5.00"}
            />
          </label>
          <button
            type="button"
            onClick={setCommission}
            className="px-4 py-2 rounded border text-sm w-fit"
          >
            Set commission
          </button>
          {commissionResult && (
            <div className="text-sm text-foreground/70">{commissionResult}</div>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Price override (audit logged)</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Batch id</span>
            <input
              value={overrideBatchId}
              onChange={(e) => setOverrideBatchId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">New base price</span>
            <input
              value={overridePrice}
              onChange={(e) => setOverridePrice(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
              placeholder="0.00"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Reason</span>
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            />
          </label>
          <button
            type="button"
            onClick={overrideBatchPrice}
            className="px-4 py-2 rounded border text-sm w-fit"
          >
            Override price
          </button>
          {overrideResult && (
            <div className="text-sm text-foreground/70">{overrideResult}</div>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Quantity adjustment (audit logged)</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Batch id</span>
            <input
              value={adjustBatchId}
              onChange={(e) => setAdjustBatchId(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono text-sm"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">New quantity</span>
            <input
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
              placeholder="e.g. 50"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Reason</span>
            <input
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            />
          </label>
          <button
            type="button"
            onClick={adjustBatchQuantity}
            className="px-4 py-2 rounded border text-sm w-fit"
          >
            Adjust quantity
          </button>
          {adjustResult && (
            <div className="text-sm text-foreground/70">{adjustResult}</div>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Rejected sale events (review)</h2>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
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
                  <td className="p-3 font-mono text-xs">{e.shop_id}</td>
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

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Open disputes</h2>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
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
                  <td className="p-3 font-mono text-xs">
                    {d.created_by} ({d.role})
                  </td>
                  <td className="p-3">
                    <div className="font-mono">{d.entity}</div>
                    <div className="font-mono text-xs text-foreground/60">
                      {d.entity_id}
                    </div>
                  </td>
                  <td className="p-3">{d.message}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => decideDispute(d.id, "resolved")}
                      className="px-2 py-1 rounded border text-xs"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => decideDispute(d.id, "rejected")}
                      className="px-2 py-1 rounded border text-xs"
                    >
                      Reject
                    </button>
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
    </div>
  );
}
