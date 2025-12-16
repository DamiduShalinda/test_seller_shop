import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { CreateBatchForm } from "@/components/seller/create-batch-form";

export default async function SellerDashboard() {
  noStore();
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, description, archived_at, created_by")
    .order("created_at", { ascending: false });

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("id, product_id, base_price, quantity, status, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

    console.log(batches)

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
        {productsError ? (
          <p className="text-sm text-destructive">Failed to load products: {productsError.message}</p>
        ) : null}
        {batchesError ? (
          <p className="text-sm text-destructive">Failed to load batches: {batchesError.message}</p>
        ) : null}
      </header>

      <section className="rounded border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Batches</h2>
          {myProducts.length === 0 ? (
            <Button asChild>
              <Link href="/dashboard/seller/products">Add a product first</Link>
            </Button>
          ) : (
            <ResponsiveFormDrawer
              title="Create batch"
              description="Create a new batch for one of your active products."
              trigger={<Button>Create batch</Button>}
            >
              <CreateBatchForm products={myProducts.map((p) => ({ id: p.id, name: p.name }))} />
            </ResponsiveFormDrawer>
          )}
        </div>
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
