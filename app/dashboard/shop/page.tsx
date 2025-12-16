import { redirect } from "next/navigation";

import { getMyRole } from "@/lib/supabase/profile";

export default async function ShopDashboard() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");
  redirect("/dashboard/shop/sales");
}
