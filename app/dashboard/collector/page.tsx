import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { createCollectionAction } from "./actions";
import { markHandoverAction } from "./handover-actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";

type CollectorCollectionRow = {
  id: string;
  batch_id: string;
  collected_quantity: number;
  seller_confirmed: boolean;
  handed_to_shop: boolean;
  created_at: string | null;
  batches: Array<{
    products: Array<{ name: string }>;
  }>;
};

export default async function CollectorDashboard() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "collector") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: collections } = await supabase
    .from("collections")
    .select(
      "id, batch_id, collected_quantity, seller_confirmed, handed_to_shop, created_at, batches(id, status, quantity, base_price, products(name))",
    )
    .eq("collector_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Collector dashboard</h1>
        <p className="text-sm text-foreground/70">
          Record collections against batches. (Assignment workflow can be added
          next; for now enter the batch id.)
        </p>
      </header>

      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Create collection</h2>
        <form action={createCollectionAction} className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Batch reference</span>
            <Input
              name="batch_id"
              className="font-mono text-sm"
              placeholder="Paste batch reference"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Collected quantity</span>
            <Input
              name="collected_quantity"
              type="number"
              min="1"
              required
            />
          </label>
          <SubmitButton className="w-fit" pendingText="Recording...">
            Record
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My collections</h2>
        <p className="text-sm text-foreground/70">
          After handing over to the shop, attach a proof reference (photo URL,
          note, receipt id, etc.).
        </p>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Collected</th>
                <th className="p-3">Seller confirmed</th>
                <th className="p-3">Handed to shop</th>
                <th className="p-3">Proof</th>
              </tr>
            </thead>
            <tbody>
              {((collections ?? []) as CollectorCollectionRow[]).map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">
                    {c.batches?.[0]?.products?.[0]?.name ?? "-"}
                  </td>
                  <td className="p-3">{c.collected_quantity}</td>
                  <td className="p-3">{c.seller_confirmed ? "Yes" : "No"}</td>
                  <td className="p-3">{c.handed_to_shop ? "Yes" : "No"}</td>
                  <td className="p-3">
                    {!c.handed_to_shop ? (
                      <form action={markHandoverAction} className="flex gap-2">
                        <input type="hidden" name="collection_id" value={c.id} />
                        <Input
                          name="handover_proof"
                          className="h-8 text-xs"
                          placeholder="proof reference"
                          required
                        />
                        <SubmitButton size="sm" variant="outline" pendingText="Saving...">
                          Mark
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-foreground/60 text-xs">Recorded</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!collections || collections.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No collections recorded yet.
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
