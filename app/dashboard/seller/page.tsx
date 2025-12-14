import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { createBatchAction } from "./actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SubmitButton } from "@/components/form/submit-button";

export default async function SellerDashboard() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, archived_at, created_by")
    .order("created_at", { ascending: false });

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: batches } = await supabase
    .from("batches")
    .select("id, product_id, base_price, quantity, status, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  const myProducts = (products ?? []).filter(
    (p) => p.created_by === userId && !p.archived_at,
  );

  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Seller dashboard</h1>
        <p className="text-sm text-foreground/70">
          Create batches and track sales. Batch quantity/price can be edited only
          while status is <span className="font-mono">created</span>.
        </p>
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/seller/products">Manage products</Link>
          </Button>
        </div>
      </header>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Create batch</h2>
        {myProducts.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Create at least one product before creating batches.
          </div>
        ) : (
          <form action={createBatchAction} className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Product</span>
            <select name="product_id" className="border rounded px-3 py-2 bg-background">
              {myProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Base price</span>
            <input
              name="base_price"
              type="number"
              step="0.01"
              min="0"
              className="border rounded px-3 py-2 bg-background"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Quantity</span>
            <input
              name="quantity"
              type="number"
              min="1"
              className="border rounded px-3 py-2 bg-background"
              required
            />
          </label>
          <SubmitButton className="w-fit" pendingText="Creating...">
            Create
          </SubmitButton>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My batches</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Price</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).map((b) => {
                const product = productById.get(b.product_id);
                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">{product?.name ?? "Unknown product"}</td>
                    <td className="p-3">{Number(b.base_price).toFixed(2)}</td>
                    <td className="p-3">{b.quantity}</td>
                    <td className="p-3 font-mono">{b.status}</td>
                    <td className="p-3">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                );
              })}
              {(!batches || batches.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No batches yet.
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
