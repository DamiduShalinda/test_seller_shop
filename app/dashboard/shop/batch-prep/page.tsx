import { redirect } from "next/navigation";

import { getMyRole } from "@/lib/supabase/profile";
import { ShopBatchPrepTool } from "@/components/shop/batch-prep-tool";

export default async function ShopBatchPrepPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Batch preparation</h1>
        <p className="text-sm text-foreground/70">
          Generate item barcodes for collected batches before the collector hands them over.
          Keep the barcode list for printing labels if needed.
        </p>
      </header>

      <ShopBatchPrepTool />

      <section className="rounded border p-4">
        <p className="text-sm text-foreground/70">
          Tip: after creating barcodes, share or print them so the collector can attach each label
          to the physical items. Once the seller confirms and the collector hands over to your shop,
          these items will be ready for stocking.
        </p>
      </section>
    </div>
  );
}
