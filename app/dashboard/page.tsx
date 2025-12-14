import { redirect } from "next/navigation";

import { getMyRole } from "@/lib/supabase/profile";

export default async function DashboardIndex() {
  const role = await getMyRole();
  if (!role) return redirect("/dashboard/onboarding");
  if (role === "seller") return redirect("/dashboard/seller");
  if (role === "collector") return redirect("/dashboard/collector");
  if (role === "shop_owner") return redirect("/dashboard/shop");
  if (role === "admin") return redirect("/dashboard/admin");
  return redirect("/dashboard/onboarding");
}

