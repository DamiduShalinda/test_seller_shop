"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";

function requireNonEmptyString(value: FormDataEntryValue | null, field: string) {
  const str = String(value ?? "").trim();
  if (!str) throw new Error(`Missing ${field}`);
  return str;
}

export async function createProductAsAdminAction(formData: FormData) {
  const role = await getMyRole();
  if (role !== "admin") throw new Error("Forbidden");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Not authenticated");

  const name = requireNonEmptyString(formData.get("name"), "name");
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw.length ? descriptionRaw : null;

  const { error } = await supabase.from("products").insert({
    name,
    description,
    created_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/products");
}

