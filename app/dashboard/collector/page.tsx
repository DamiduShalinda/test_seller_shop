import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { collectorCreateBatchAction, collectorCreateProductAction } from "./actions";
import { markHandoverAction } from "./handover-actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { CollectorHandoverForm } from "./handover-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

type SellerRow = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  name: string;
  created_by: string | null;
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

  const { data: shops } = await supabase
    .from("shops")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(200);

  const { data: sellers } = await supabase
    .from("sellers")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(500);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, created_by")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const shopOptions = (shops ?? []) as Array<{ id: string; name: string }>;
  const sellerOptions = (sellers ?? []) as SellerRow[];
  const productOptions = (products ?? []) as ProductRow[];
  const sellerNameById = new Map(sellerOptions.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Collector dashboard</h1>
        <p className="text-sm text-foreground/70">
          Capture seller inventory. Saving a batch now logs the pickup automatically. Sellers
          confirm from their dashboard before you hand over to a shop.
        </p>
      </header>

      <section className="rounded border p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Create seller inventory</h2>
          <p className="text-sm text-foreground/70">
            Capture products and batches while you are with the seller. We record the pickup
            as soon as you save the batch—no extra collection form needed.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ResponsiveFormDrawer
            title="Record seller product"
            description="Add a new product on behalf of a seller."
            trigger={<Button variant="secondary">Add product</Button>}
          >
            {sellerOptions.length === 0 ? (
              <p className="text-sm text-foreground/70">
                No sellers available. Ask an admin to onboard sellers first.
              </p>
            ) : (
              <form action={collectorCreateProductAction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="seller_id">Seller</Label>
                  <select
                    id="seller_id"
                    name="seller_id"
                    className="border rounded px-3 py-2 bg-background text-sm"
                    required
                  >
                    {sellerOptions.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Product name</Label>
                  <Input id="name" name="name" placeholder="e.g. Classic T-Shirt" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Notes about size, color, etc."
                  />
                </div>
                <SubmitButton className="w-fit" pendingText="Recording...">
                  Save product
                </SubmitButton>
              </form>
            )}
          </ResponsiveFormDrawer>

          <ResponsiveFormDrawer
            title="Record seller batch"
            description="Start a new batch for one of the seller products."
            trigger={<Button>Add batch</Button>}
          >
            {productOptions.length === 0 ? (
              <p className="text-sm text-foreground/70">
                No active products. Add a product first.
              </p>
            ) : (
              <form action={collectorCreateBatchAction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="product_option">Product</Label>
                  <select
                    id="product_option"
                    name="product_option"
                    className="border rounded px-3 py-2 bg-background text-sm"
                    required
                  >
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {sellerNameById.get(product.created_by ?? "") ?? "Unknown seller"} —{" "}
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="base_price">Base price</Label>
                  <Input
                    id="base_price"
                    name="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" required />
                </div>
                <SubmitButton className="w-fit" pendingText="Recording...">
                  Save batch
                </SubmitButton>
              </form>
            )}
          </ResponsiveFormDrawer>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pickups & handovers</h2>
        <p className="text-sm text-foreground/70">
          Every saved batch creates a pickup record automatically. Wait for seller confirmation,
          then hand it over to a shop with proof.
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
                      shopOptions.length > 0 ? (
                        <CollectorHandoverForm
                          collectionId={c.id}
                          shops={shopOptions}
                          action={markHandoverAction}
                        />
                      ) : (
                        <span className="text-foreground/60 text-xs">
                          No shops found.
                        </span>
                      )
                    ) : (
                      <span className="text-foreground/60 text-xs">Recorded</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!collections || collections.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No pickups recorded yet.
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
