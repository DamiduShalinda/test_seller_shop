import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { ShopSalePanel } from "@/components/shop/shop-sale-panel";

export default async function ShopDashboard() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: inventory } = await supabase
    .from("items")
    .select("id, barcode, status, created_at, batches(products(name), sellers(name))")
    .eq("current_shop_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: sales } = await supabase
    .from("sales")
    .select("id, sold_price, sold_at, items(barcode)")
    .eq("shop_id", userId)
    .order("sold_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("sale_events")
    .select("id, client_event_id, barcode, sold_price, occurred_at, status, reason")
    .eq("shop_id", userId)
    .order("received_at", { ascending: false })
    .limit(100);

  type Embedded<T> = T | T[] | null;

  function one<T>(value: Embedded<T> | undefined): T | undefined {
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Shop dashboard</h1>
        <p className="text-sm text-foreground/70">
          Sales require barcode scanning. Offline sales queue locally and sync
          via idempotent sale events.
        </p>
      </header>

      <ShopSalePanel />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Inventory (latest 100)</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Barcode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Product</th>
                <th className="p-3">Seller</th>
              </tr>
            </thead>
            <tbody>
              {(
                (inventory ?? []) as Array<{
                  id: string;
                  barcode: string;
                  status: string;
                  batches: Embedded<{
                    products: Embedded<{ name: string }>;
                    sellers: Embedded<{ name: string }>;
                  }>;
                }>
              ).map((i) => {
                const batch = one(i.batches);
                const product = one(batch?.products);
                const seller = one(batch?.sellers);
                return (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-mono">{i.barcode}</td>
                    <td className="p-3 font-mono">{i.status}</td>
                    <td className="p-3">{product?.name ?? "-"}</td>
                    <td className="p-3">{seller?.name ?? "-"}</td>
                  </tr>
                );
              })}
              {(!inventory || inventory.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={4}>
                    No inventory yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sales (latest 100)</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Barcode</th>
                <th className="p-3">Price</th>
                <th className="p-3">At</th>
              </tr>
            </thead>
            <tbody>
              {(
                (sales ?? []) as Array<{
                  id: string;
                  sold_price: number;
                  sold_at: string | null;
                  items: Embedded<{ barcode: string }>;
                }>
              ).map((s) => {
                const item = one(s.items);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-mono">{item?.barcode ?? "-"}</td>
                    <td className="p-3">{Number(s.sold_price).toFixed(2)}</td>
                    <td className="p-3">
                      {s.sold_at ? new Date(s.sold_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                );
              })}
              {(!sales || sales.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={3}>
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sale events (latest 100)</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Barcode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 font-mono">{e.barcode}</td>
                  <td className="p-3 font-mono">{e.status}</td>
                  <td className="p-3">{e.reason ?? "-"}</td>
                </tr>
              ))}
              {(!events || events.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={3}>
                    No events yet.
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
