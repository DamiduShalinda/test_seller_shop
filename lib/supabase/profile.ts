import { createClient } from "@/lib/supabase/server";

export type AppRole = "seller" | "collector" | "shop_owner" | "admin";

export async function getAuthedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return { id: data.claims.sub as string };
}

export async function getMyRole(): Promise<AppRole | null> {
  const user = await getAuthedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.role) return null;
  return data.role as AppRole;
}

