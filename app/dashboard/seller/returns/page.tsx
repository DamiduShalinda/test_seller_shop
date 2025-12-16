import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { requestReturnAction } from "../return-actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { Label } from "@/components/ui/label";

type SellerBatchRow = {
  id: string;
  status: string;
  products: Array<{ name: string }>;
};

type Embedded<T> = T | T[] | null;

type ReturnRequestRow = {
  id: string;
  requested_quantity: number;
  status: string;
  admin_note: string | null;
  batches: Embedded<{
    products: Embedded<{ name: string }>;
  }>;
};

function one<T>(value: Embedded<T> | undefined): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function SellerReturnsPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: batches } = await supabase
    .from("batches")
    .select("id, status, products(name)")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  const { data: requests } = await supabase
    .from("return_requests")
    .select(
      "id, batch_id, requested_quantity, status, admin_note, created_at, decided_at, completed_at, batches(products(name))",
    )
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Returns / withdrawals</h1>
        <p className="text-sm text-foreground/70">
          Request a return for unsold items currently in shop. Admin approves and
          completes the return.
        </p>
      </header>

      <div>
        <ResponsiveFormDrawer
          title="Request return"
          description="Request a return for unsold items currently in shop."
          trigger={<Button>Request return</Button>}
        >
          <form action={requestReturnAction} className="grid gap-4">
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
              <Label htmlFor="requested_quantity">Quantity to return</Label>
              <Input id="requested_quantity" name="requested_quantity" type="number" min="1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input id="reason" name="reason" placeholder="Unsold / expired / withdraw" />
            </div>
            <SubmitButton className="w-fit" pendingText="Submitting...">
              Submit request
            </SubmitButton>
          </form>
        </ResponsiveFormDrawer>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My return requests</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Status</th>
                <th className="p-3">Admin note</th>
              </tr>
            </thead>
            <tbody>
              {((requests ?? []) as ReturnRequestRow[]).map((r) => {
                const batch = one(r.batches);
                const product = one(batch?.products);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{product?.name ?? "-"}</td>
                    <td className="p-3">{r.requested_quantity}</td>
                    <td className="p-3 font-mono">{r.status}</td>
                    <td className="p-3">{r.admin_note ?? "-"}</td>
                  </tr>
                );
              })}
              {(!requests || requests.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={4}>
                    No return requests.
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
