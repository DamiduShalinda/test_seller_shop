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

export default async function StockCheckerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const productQuery = String(params.product ?? "").trim();
  const barcodeQuery = String(params.barcode ?? "").trim();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const shopId = claimsData?.claims?.sub;
  if (!shopId) redirect("/auth/login");

  const { data: inventoryData } = await supabase
    .from("items")
    .select("id, barcode, status, created_at, batches(products(name), sellers(name))")
    .eq("current_shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(5000);

  const inventory = (inventoryData ?? []) as InventoryRow[];

  const barcodeMatch = barcodeQuery
    ? inventory.find((x) => x.barcode?.toLowerCase() === barcodeQuery.toLowerCase())
    : undefined;

  const grouped = Object.entries(
    inventory.reduce<
      Record<
        string,
        { total: number; inShop: number; sold: number; returned: number; other: number }
      >
    >((acc, row) => {
      const batch = one(row.batches);
      const product = one(batch?.products)?.name ?? "(unknown)";
      const entry = acc[product] ?? { total: 0, inShop: 0, sold: 0, returned: 0, other: 0 };
      entry.total += 1;
      if (row.status === "in_shop") entry.inShop += 1;
      else if (row.status === "sold") entry.sold += 1;
      else if (row.status === "returned") entry.returned += 1;
      else entry.other += 1;
      acc[product] = entry;
      return acc;
    }, {}),
  )
    .filter(([product]) =>
      productQuery ? product.toLowerCase().includes(productQuery.toLowerCase()) : true,
    )
    .sort((a, b) => b[1].inShop - a[1].inShop);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Stock checker</h1>
        <p className="text-sm text-foreground/70">
          Quick view of stock by product: “this item → this quantity”.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded border p-3">
          <form className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Filter by product</span>
              <Input name="product" defaultValue={productQuery} placeholder="e.g. shampoo" />
            </label>
            <Button type="submit" className="w-fit">
              Apply
            </Button>
            <Button asChild variant="ghost" className="w-fit">
              <Link href="/dashboard/shop/stock-checker">Reset</Link>
            </Button>
          </form>

          <form className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Check barcode</span>
              <Input name="barcode" defaultValue={barcodeQuery} placeholder="scan / type barcode" />
            </label>
            <input type="hidden" name="product" value={productQuery} />
            <Button type="submit" variant="secondary" className="w-fit">
              Check
            </Button>
          </form>

          {barcodeQuery && (
            <div className="rounded border bg-muted/20 p-3 text-sm">
              {barcodeMatch ? (
                (() => {
                  const batch = one(barcodeMatch.batches);
                  const product = one(batch?.products)?.name ?? "-";
                  const seller = one(batch?.sellers)?.name ?? "-";
                  return (
                    <div className="grid gap-1">
                      <div>
                        Barcode: <span className="font-mono">{barcodeMatch.barcode}</span>
                      </div>
                      <div>Product: {product}</div>
                      <div>Seller: {seller}</div>
                      <div>
                        Status: <span className="font-mono">{barcodeMatch.status}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-foreground/70">
                  No item found in this shop inventory for barcode{" "}
                  <span className="font-mono">{barcodeQuery}</span>.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Item (product)</th>
                <th className="p-3">Quantity (in shop)</th>
                <th className="p-3">Sold</th>
                <th className="p-3">Returned</th>
                <th className="p-3">Other</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([product, counts]) => (
                <tr key={product} className="border-t">
                  <td className="p-3">{product}</td>
                  <td className="p-3 font-medium">{counts.inShop}</td>
                  <td className="p-3">{counts.sold}</td>
                  <td className="p-3">{counts.returned}</td>
                  <td className="p-3">{counts.other}</td>
                  <td className="p-3">{counts.total}</td>
                </tr>
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={6}>
                    No matching products.
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

