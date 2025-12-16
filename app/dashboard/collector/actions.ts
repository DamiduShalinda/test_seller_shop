"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function createCollectionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const batchId = String(formData.get("batch_id") ?? "");
  const collectedQuantity = Number(formData.get("collected_quantity") ?? "");

  if (!batchId) throw new Error("Missing batch_id");
  if (!isUuid(batchId)) throw new Error("Invalid batch_id");
  if (!Number.isInteger(collectedQuantity) || collectedQuantity <= 0) {
    throw new Error("Invalid collected_quantity");
  }

  const { error } = await supabase.rpc("create_collection", {
    batch_id: batchId,
    collected_quantity: collectedQuantity,
  });

  if (error) {
    if (error.message.includes("Could not find the function public.create_collection")) {
      throw new Error(
        "Database RPC create_collection() not found. Apply latest Supabase migrations and refresh the PostgREST schema cache.",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/dashboard/collector");
}
