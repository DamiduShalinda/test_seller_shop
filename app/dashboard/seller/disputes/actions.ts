"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createDisputeAction(formData: FormData) {
  const entity = String(formData.get("entity") ?? "");
  const entityId = String(formData.get("entity_id") ?? "");
  const message = String(formData.get("message") ?? "");

  if (!entity || !entityId || !message.trim()) throw new Error("Missing fields");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const { data: userRow, error: userRowError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (userRowError || !userRow?.role) throw new Error("Role not set");

  const { error } = await supabase.from("disputes").insert({
    created_by: userId,
    role: userRow.role,
    entity,
    entity_id: entityId,
    message: message.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/seller/disputes");
}

