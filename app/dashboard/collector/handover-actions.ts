"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function markHandoverAction(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  const proof = String(formData.get("handover_proof") ?? "");

  if (!collectionId) throw new Error("Missing collection_id");
  if (!proof.trim()) throw new Error("Missing proof");

  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .update({
      handed_to_shop: true,
      handover_proof: proof.trim(),
      handed_to_shop_at: new Date().toISOString(),
    })
    .eq("id", collectionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/collector");
}

