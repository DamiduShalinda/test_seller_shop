import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { confirmCollectionAction } from "./actions";
import { SubmitButton } from "@/components/form/submit-button";

type SellerCollectionRow = {
  id: string;
  batch_id: string;
  collected_quantity: number;
  seller_confirmed: boolean;
  handed_to_shop: boolean;
  handover_proof: string | null;
  created_at: string | null;
  batches: Array<{
    seller_id: string;
    products: Array<{ name: string }>;
  }>;
};

export default async function SellerCollectionsPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: rows } = await supabase
    .from("collections")
    .select(
      "id, batch_id, collected_quantity, seller_confirmed, handed_to_shop, handover_proof, created_at, batches(id, seller_id, products(name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const mine = (rows ?? []) as SellerCollectionRow[];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Collections to confirm</h1>
        <p className="text-sm text-foreground/70">
          Confirm collected quantities before the handover to shop is finalized.
        </p>
      </header>

      <section className="rounded border overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <th className="p-3">Product</th>
              <th className="p-3">Collected</th>
              <th className="p-3">Confirmed</th>
              <th className="p-3">Handover</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  {c.batches?.[0]?.products?.[0]?.name ?? "-"}
                </td>
                <td className="p-3">{c.collected_quantity}</td>
                <td className="p-3">{c.seller_confirmed ? "Yes" : "No"}</td>
                <td className="p-3">
                  {c.handed_to_shop ? "Yes" : "No"}{" "}
                  {c.handover_proof ? (
                    <span className="text-foreground/60 text-xs">
                      ({c.handover_proof})
                    </span>
                  ) : null}
                </td>
                <td className="p-3">
                  {!c.seller_confirmed ? (
                    <form action={confirmCollectionAction}>
                      <input type="hidden" name="collection_id" value={c.id} />
                      <SubmitButton size="sm" variant="outline" pendingText="Confirming...">
                        Confirm
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="text-foreground/60 text-xs">Done</span>
                  )}
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr>
                <td className="p-3 text-foreground/60" colSpan={5}>
                  No collections for your batches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
