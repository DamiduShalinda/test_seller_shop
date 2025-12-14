"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function requestReturnAction(formData: FormData) {
  const batchId = String(formData.get("batch_id") ?? "");
  const requestedQuantity = Number(formData.get("requested_quantity") ?? "");
  const reason = String(formData.get("reason") ?? "") || null;

  if (!batchId) throw new Error("Missing batch");
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_seller_request_return", {
    p_batch_id: batchId,
    p_requested_quantity: requestedQuantity,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/seller/returns");
}

