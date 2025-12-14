"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function confirmCollectionAction(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) throw new Error("Missing collection_id");

  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .update({ seller_confirmed: true })
    .eq("id", collectionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/seller/collections");
}

