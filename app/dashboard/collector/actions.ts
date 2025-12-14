"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createCollectionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const batchId = String(formData.get("batch_id") ?? "");
  const collectedQuantity = Number(formData.get("collected_quantity") ?? "");

  if (!batchId) throw new Error("Missing batch_id");
  if (!Number.isInteger(collectedQuantity) || collectedQuantity <= 0) {
    throw new Error("Invalid collected_quantity");
  }

  const { error } = await supabase.from("collections").insert({
    batch_id: batchId,
    collector_id: userId,
    collected_quantity: collectedQuantity,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/collector");
}

