import { redirect } from "next/navigation";

import { getMyRole } from "@/lib/supabase/profile";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "admin") redirect("/dashboard");

  return <div className="space-y-6">{children}</div>;
}

