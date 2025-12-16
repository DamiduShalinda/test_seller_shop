"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function markHandoverAction(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  const shopId = String(formData.get("shop_id") ?? "");
  const proof = String(formData.get("handover_proof") ?? "");

  if (!collectionId) throw new Error("Missing collection_id");
  if (!shopId) throw new Error("Missing shop_id");
  if (!proof.trim()) throw new Error("Missing proof");

  const supabase = await createClient();
  console.log(collectionId, shopId, proof);
  const { error } = await supabase.rpc("handover_collection_to_shop", {
    collection_id: collectionId,
    p_shop_id: shopId,
    p_handover_proof: proof.trim(),
  });

  if (error) {
    const details =
      "details" in error && typeof error.details === "string" && error.details
        ? ` (${error.details})`
        : "";
    const message = `${error.message}${details}`;
    if (error.message.includes("Not enough items available to hand over")) {
      throw new Error(
        `${message}. Ensure item barcodes exist for this batch (Admin Tools → Create items) and that enough items are still unassigned (not already stocked/sold).`,
      );
    }
    throw new Error(message);
  }
  revalidatePath("/dashboard/collector");
}
