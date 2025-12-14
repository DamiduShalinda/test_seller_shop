"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function requestDiscountAction(formData: FormData) {
  const batchId = String(formData.get("batch_id") ?? "");
  const discountPrice = Number(formData.get("discount_price") ?? "");
  const itemLimitRaw = String(formData.get("item_limit") ?? "");
  const expiresAt = String(formData.get("expires_at") ?? "");

  const itemLimit =
    itemLimitRaw.trim() === "" ? null : Number.parseInt(itemLimitRaw, 10);

  if (!batchId) throw new Error("Missing batch");
  if (!Number.isFinite(discountPrice) || discountPrice < 0) {
    throw new Error("Invalid discount price");
  }
  if (itemLimit != null && (!Number.isInteger(itemLimit) || itemLimit <= 0)) {
    throw new Error("Invalid item limit");
  }
  if (!expiresAt) throw new Error("Missing expiry");

  const supabase = await createClient();
  const { error } = await supabase.from("discounts").insert({
    batch_id: batchId,
    item_limit: itemLimit,
    discount_price: discountPrice,
    expires_at: expiresAt,
    status: "pending",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/seller/discounts");
}

