import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { requestDiscountAction } from "../discount-actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type SellerBatchRow = {
  id: string;
  status: string;
  base_price: number;
  quantity: number;
  products: Array<{ name: string }>;
};

export default async function SellerDiscountsPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: batches } = await supabase
    .from("batches")
    .select("id, status, base_price, quantity, products(name)")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  const { data: discounts } = await supabase
    .from("discounts")
    .select("id, batch_id, discount_price, item_limit, status, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const productNameByBatchId = new Map<string, string>(
    ((batches ?? []) as SellerBatchRow[]).map((b) => [b.id, b.products?.[0]?.name ?? ""]),
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Discounts</h1>
        <p className="text-sm text-foreground/70">
          Request discounts per batch. Admin decides; pending requests older than 2
          days are auto-rejected by a nightly job.
        </p>
      </header>

      <div>
        <ResponsiveFormDrawer
          title="Request discount"
          description="Request a discount per batch (admin must accept)."
          trigger={<Button>Request discount</Button>}
        >
          <form action={requestDiscountAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="batch_id">Batch</Label>
              <select id="batch_id" name="batch_id" className="border rounded px-3 py-2 bg-background">
                {((batches ?? []) as SellerBatchRow[]).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.products?.[0]?.name ?? "Product"} (status: {b.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discount_price">Discount price</Label>
              <Input id="discount_price" name="discount_price" type="number" step="0.01" min="0" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item_limit">Item limit (optional)</Label>
              <Input id="item_limit" name="item_limit" type="number" min="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires_at">Expires at</Label>
              <Input id="expires_at" name="expires_at" type="datetime-local" required />
            </div>
            <SubmitButton className="w-fit" pendingText="Submitting...">
              Submit request
            </SubmitButton>
          </form>
        </ResponsiveFormDrawer>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My discount requests</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Price</th>
                <th className="p-3">Limit</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {(discounts ?? [])
                .filter((d) => (batches ?? []).some((b) => b.id === d.batch_id))
                .map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3">{productNameByBatchId.get(d.batch_id) ?? "-"}</td>
                    <td className="p-3">{Number(d.discount_price).toFixed(2)}</td>
                    <td className="p-3">{d.item_limit ?? "-"}</td>
                    <td className="p-3 font-mono">{d.status}</td>
                    <td className="p-3">
                      {d.expires_at ? new Date(d.expires_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              {(!discounts || discounts.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No discounts.
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
