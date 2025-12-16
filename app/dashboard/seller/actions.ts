"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createBatchAction(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const productId = String(formData.get("product_id") ?? "");
  const basePrice = Number(formData.get("base_price") ?? "");
  const quantity = Number(formData.get("quantity") ?? "");

  if (!productId) throw new Error("Missing product");
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error("Invalid price");
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid quantity");

  const { data: product, error: productErr } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("created_by", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (productErr) throw new Error(productErr.message);
  if (!product) throw new Error("Invalid product");

  const { error } = await supabase.from("batches").insert({
    seller_id: userId,
    product_id: productId,
    base_price: basePrice,
    quantity,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/seller");
}

export async function createBatchActionWithState(
  _prevState: { ok: boolean; error?: string; submittedAt?: number } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; submittedAt?: number }> {
  try {
    await createBatchAction(formData);
    return { ok: true, submittedAt: Date.now() };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create batch",
      submittedAt: Date.now(),
    };
  }
}
