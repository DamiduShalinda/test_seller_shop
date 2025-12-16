import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Embedded<T> = T | T[] | null;

function one<T>(value: Embedded<T> | undefined): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type InventoryRow = {
  id: string;
  barcode: string;
  status: string;
  created_at: string | null;
  batches: Embedded<{
    products: Embedded<{ name: string }>;
    sellers: Embedded<{ name: string }>;
  }>;
};

export default async function ShopInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const productQuery = String(params.product ?? "").trim();
  const statusQuery = String(params.status ?? "").trim();
  const view = (String(params.view ?? "list").trim() || "list") as "list" | "group";

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const shopId = claimsData?.claims?.sub;
  if (!shopId) redirect("/auth/login");

  const { data } = await supabase
    .from("items")
    .select("id, barcode, status, created_at, batches(products(name), sellers(name))")
    .eq("current_shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(500);

  const inventory = (data ?? []) as InventoryRow[];
  const filtered = inventory.filter((row) => {
    const batch = one(row.batches);
    const productName = one(batch?.products)?.name ?? "";
    const matchesProduct = productQuery
      ? productName.toLowerCase().includes(productQuery.toLowerCase())
      : true;
    const matchesStatus = statusQuery ? row.status === statusQuery : true;
    return matchesProduct && matchesStatus;
  });

  const statuses = Array.from(new Set(inventory.map((x) => x.status))).sort();

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-foreground/70">
          Filter by product or status, or group by product to see quantities.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-end">
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Product</span>
              <Input name="product" defaultValue={productQuery} placeholder="e.g. shampoo" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Status</span>
              <select
                name="status"
                defaultValue={statusQuery}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
              <Link href="/dashboard/shop/inventory">Reset</Link>
            </Button>
          </form>
          <div className="text-xs text-foreground/70">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{inventory.length}</span>
          </div>
        </div>

        {view === "group" ? (
          <div className="rounded border overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-3">Product</th>
                  <th className="p-3">In shop</th>
                  <th className="p-3">Sold</th>
                  <th className="p-3">Returned</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  filtered.reduce<Record<string, { total: number; inShop: number; sold: number; returned: number }>>(
                    (acc, row) => {
                      const batch = one(row.batches);
                      const product = one(batch?.products)?.name ?? "(unknown)";
                      const entry = acc[product] ?? { total: 0, inShop: 0, sold: 0, returned: 0 };
                      entry.total += 1;
                      if (row.status === "in_shop") entry.inShop += 1;
                      if (row.status === "sold") entry.sold += 1;
                      if (row.status === "returned") entry.returned += 1;
                      acc[product] = entry;
                      return acc;
                    },
                    {},
                  ),
                )
                  .sort((a, b) => b[1].inShop - a[1].inShop)
                  .map(([product, counts]) => (
                    <tr key={product} className="border-t">
                      <td className="p-3">{product}</td>
                      <td className="p-3">{counts.inShop}</td>
                      <td className="p-3">{counts.sold}</td>
                      <td className="p-3">{counts.returned}</td>
                      <td className="p-3">{counts.total}</td>
                    </tr>
                  ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-foreground/60" colSpan={5}>
                      No matching inventory.
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
                  <th className="p-3">Status</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Seller</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const batch = one(row.batches);
                  const product = one(batch?.products);
                  const seller = one(batch?.sellers);
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-mono">{row.barcode}</td>
                      <td className="p-3 font-mono">{row.status}</td>
                      <td className="p-3">{product?.name ?? "-"}</td>
                      <td className="p-3">{seller?.name ?? "-"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-foreground/60" colSpan={4}>
                      No matching inventory.
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

