import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { ShopSalePanel } from "@/components/shop/shop-sale-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Embedded<T> = T | T[] | null;

function one<T>(value: Embedded<T> | undefined): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type SaleRow = {
  id: string;
  sold_price: number;
  sold_at: string | null;
  items: Embedded<{
    barcode: string;
    batches: Embedded<{
      products: Embedded<{ name: string }>;
      sellers: Embedded<{ name: string }>;
    }>;
  }>;
};

export default async function ShopSalesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const productQuery = String(params.product ?? "").trim();
  const view = (String(params.view ?? "list").trim() || "list") as "list" | "group";

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const shopId = claimsData?.claims?.sub;
  if (!shopId) redirect("/auth/login");

  const { data } = await supabase
    .from("sales")
    .select("id, sold_price, sold_at, items(barcode, batches(products(name), sellers(name)))")
    .eq("shop_id", shopId)
    .order("sold_at", { ascending: false })
    .limit(500);

  const sales = (data ?? []) as SaleRow[];
  const filtered = sales.filter((row) => {
    const item = one(row.items);
    const batch = one(item?.batches);
    const productName = one(batch?.products)?.name ?? "";
    return productQuery ? productName.toLowerCase().includes(productQuery.toLowerCase()) : true;
  });

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Sales</h1>
        <p className="text-sm text-foreground/70">
          Sales require barcode scanning. Offline sales queue locally and sync via idempotent sale events.
        </p>
      </header>

      <ShopSalePanel />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-end">
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Product</span>
              <Input name="product" defaultValue={productQuery} placeholder="e.g. shampoo" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">View</span>
              <select
                name="view"
                defaultValue={view}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="list">List</option>
                <option value="group">Group by product</option>
              </select>
            </label>
            <Button type="submit" className="w-fit">
              Apply
            </Button>
            <Button asChild variant="ghost" className="w-fit">
              <Link href="/dashboard/shop/sales">Reset</Link>
            </Button>
          </form>
          <div className="text-xs text-foreground/70">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{sales.length}</span>
          </div>
        </div>

        {view === "group" ? (
          <div className="rounded border overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-3">Product</th>
                  <th className="p-3">Sold qty</th>
                  <th className="p-3">Revenue</th>
                  <th className="p-3">Avg price</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  filtered.reduce<Record<string, { qty: number; revenue: number }>>((acc, row) => {
                    const item = one(row.items);
                    const batch = one(item?.batches);
                    const product = one(batch?.products)?.name ?? "(unknown)";
                    const entry = acc[product] ?? { qty: 0, revenue: 0 };
                    entry.qty += 1;
                    entry.revenue += Number(row.sold_price ?? 0);
                    acc[product] = entry;
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([product, m]) => (
                    <tr key={product} className="border-t">
                      <td className="p-3">{product}</td>
                      <td className="p-3">{m.qty}</td>
                      <td className="p-3">{m.revenue.toFixed(2)}</td>
                      <td className="p-3">{(m.qty ? m.revenue / m.qty : 0).toFixed(2)}</td>
                    </tr>
                  ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-foreground/60" colSpan={4}>
                      No matching sales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-3">Barcode</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const item = one(row.items);
                  const batch = one(item?.batches);
                  const product = one(batch?.products)?.name ?? "-";
                  const seller = one(batch?.sellers)?.name ?? "-";
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-mono">{item?.barcode ?? "-"}</td>
                      <td className="p-3">{product}</td>
                      <td className="p-3">{seller}</td>
                      <td className="p-3">{Number(row.sold_price).toFixed(2)}</td>
                      <td className="p-3">{row.sold_at ? new Date(row.sold_at).toLocaleString() : "-"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-foreground/60" colSpan={5}>
                      No matching sales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

