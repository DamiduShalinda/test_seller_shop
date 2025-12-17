import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { AppSidebar, type AppSidebarItem } from "@/components/dashboard/app-sidebar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login");

  const role = await getMyRole();

  const navItems: AppSidebarItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { title: "Notifications", href: "/dashboard/notifications", icon: "notifications" },
  ];

  if (!role) {
    navItems.splice(1, 0, {
      title: "Account setup",
      href: "/dashboard/onboarding",
      icon: "dashboard",
    });
  } else if (role === "seller") {
    navItems.splice(
      1,
      0,
      { title: "Products", href: "/dashboard/seller/products", icon: "products" },
      { title: "Batches", href: "/dashboard/seller", icon: "dashboard" },
      { title: "Wallet", href: "/dashboard/seller/wallet", icon: "wallet" },
      { title: "Discounts", href: "/dashboard/seller/discounts", icon: "discounts" },
      { title: "Returns", href: "/dashboard/seller/returns", icon: "returns" },
      { title: "Pickups", href: "/dashboard/seller/collections", icon: "collections" },
      { title: "Disputes", href: "/dashboard/seller/disputes", icon: "disputes" },
    );
  } else if (role === "collector") {
    navItems.splice(1, 0, { title: "Pickups", href: "/dashboard/collector", icon: "collections" });
  } else if (role === "shop_owner") {
    navItems.splice(
      1,
      0,
      { title: "Sales", href: "/dashboard/shop/sales", icon: "sales" },
      { title: "Inventory", href: "/dashboard/shop/inventory", icon: "inventory" },
      { title: "Batch prep", href: "/dashboard/shop/batch-prep", icon: "collections" },
      { title: "Stock checker", href: "/dashboard/shop/stock-checker", icon: "stock" },
      { title: "Sale events", href: "/dashboard/shop/events", icon: "events" },
    );
  } else if (role === "admin") {
    navItems.splice(
      1,
      0,
      { title: "Admin overview", href: "/dashboard/admin", icon: "admin" },
      { title: "Admin tools", href: "/dashboard/admin/tools", icon: "admin_tools" },
      { title: "Products", href: "/dashboard/admin/products", icon: "products" },
      { title: "Batches", href: "/dashboard/admin/batches", icon: "dashboard" },
      { title: "Audit", href: "/dashboard/admin/audit", icon: "admin_audit" },
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold">
              Seller Shop
            </Link>
            <div className="md:hidden">
              <DashboardMobileNav items={navItems} />
            </div>
            <Badge variant="secondary" className="hidden md:inline-flex">
              {role ?? "role not set"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="flex w-full">
        <aside className="hidden w-64 border-r md:block">
          <div className="sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto">
            <AppSidebar items={navItems} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
