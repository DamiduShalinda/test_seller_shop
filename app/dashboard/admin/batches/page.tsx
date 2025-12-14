import { createClient } from "@/lib/supabase/server";
import { getUserDisplayNameMap } from "@/lib/supabase/user-display-name";

type BatchRow = {
  id: string;
  seller_id: string;
  products: Array<{ name: string }>;
  base_price: number;
  quantity: number;
  status: string;
  created_at: string | null;
};

export default async function AdminBatchesPage() {
  const supabase = await createClient();

  const { data: batches } = await supabase
    .from("batches")
    .select("id, seller_id, base_price, quantity, status, created_at, products(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const sellerNameById = await getUserDisplayNameMap(
    supabase,
    (batches ?? []).map((b) => b.seller_id),
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Batches</h1>
        <p className="text-sm text-muted-foreground">Latest batches across the system.</p>
      </header>

      <section className="rounded border overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <th className="p-3">Seller</th>
              <th className="p-3">Product</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {((batches ?? []) as BatchRow[]).map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{sellerNameById.get(b.seller_id) ?? "-"}</td>
                <td className="p-3">{b.products?.[0]?.name ?? "-"}</td>
                <td className="p-3">{b.quantity}</td>
                <td className="p-3">{Number(b.base_price).toFixed(2)}</td>
                <td className="p-3 font-mono">{b.status}</td>
                <td className="p-3">
                  {b.created_at ? new Date(b.created_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
            {(!batches || batches.length === 0) && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  No batches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
