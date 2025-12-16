"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function confirmCollectionAction(formData: FormData) {
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionId) throw new Error("Missing collection_id");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_collection", {
    collection_id: collectionId,
  });

  if (error) {
    const message = String(error.message ?? "Unknown error");
    if (error.code === "PGRST202" || message.includes("schema cache")) {
      throw new Error(
        "Database function `public.confirm_collection(uuid)` is missing (or PostgREST schema cache is stale). Apply the migration `supabase/migrations/20251214213000_confirm_collection_rpc.sql` to your Supabase project, then reload the schema cache.",
      );
    }
    throw new Error(message);
  }
  revalidatePath("/dashboard/seller/collections");
}
