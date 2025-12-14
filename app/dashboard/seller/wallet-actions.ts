"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function requestPayoutAction(formData: FormData) {
  const amount = Number(formData.get("amount") ?? "");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_seller_request_payout", {
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/seller/wallet");
}

