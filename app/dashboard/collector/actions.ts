"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function collectorCreateProductAction(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const sellerId = String(formData.get("seller_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!sellerId) throw new Error("Missing seller");
  if (!isUuid(sellerId)) throw new Error("Invalid seller id");
  if (!name) throw new Error("Missing product name");

  const { error } = await supabase.rpc("collector_create_product", {
    p_seller_id: sellerId,
    p_name: name,
    p_description: description.length ? description : null,
  });

  if (error) {
    if (error.message.includes("public.collector_create_product")) {
      throw new Error(
        "Database RPC collector_create_product() not found. Apply the latest Supabase migrations and reload the PostgREST schema cache (supabase db reset / supabase db remote commit).",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/dashboard/collector");
}

export async function collectorCreateBatchAction(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const productSelection = String(formData.get("product_option") ?? "").trim();
  const basePrice = Number(formData.get("base_price") ?? "");
  const quantity = Number(formData.get("quantity") ?? "");

  const productId = productSelection;
  if (!isUuid(productId)) throw new Error("Invalid product id");

  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error("Invalid price");
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid quantity");

  const { error } = await supabase.rpc("collector_create_batch", {
    p_product_id: productId,
    p_base_price: basePrice,
    p_quantity: quantity,
  });

  if (error) {
    if (error.message.includes("public.collector_create_batch")) {
      throw new Error(
        "Database RPC collector_create_batch() not found. Apply the latest Supabase migrations and reload the PostgREST schema cache (supabase db reset / supabase db remote commit).",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/dashboard/collector");
}
