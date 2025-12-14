"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  Package,
  ScrollText,
  Shield,
  Store,
  Tag,
  Truck,
  Undo2,
  Wallet,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type AppSidebarItem = {
  title: string;
  href: string;
  icon:
    | "dashboard"
    | "notifications"
    | "products"
    | "sales"
    | "collections"
    | "wallet"
    | "discounts"
    | "returns"
    | "disputes"
    | "admin_tools"
    | "admin_audit"
    | "admin";
};

const icons = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  products: Package,
  sales: Store,
  collections: Truck,
  wallet: Wallet,
  discounts: Tag,
  returns: Undo2,
  disputes: ClipboardList,
  admin_tools: Wrench,
  admin_audit: ScrollText,
  admin: Shield,
} as const;

function matchScore(pathname: string, href: string) {
  if (!pathname) return null;
  if (href === "/dashboard") return pathname === "/dashboard" ? href.length : null;
  if (pathname === href) return href.length;
  if (pathname.startsWith(`${href}/`)) return href.length;
  return null;
}

export function AppSidebar({ items }: { items: AppSidebarItem[] }) {
  const pathname = usePathname();
  const activeHref =
    items
      .map((item) => ({ href: item.href, score: matchScore(pathname, item.href) }))
      .filter((x): x is { href: string; score: number } => typeof x.score === "number")
      .sort((a, b) => b.score - a.score)[0]?.href ?? null;

  return (
    <div className="flex h-full w-full flex-col gap-3 p-3">
      <div className="px-2 py-1 text-sm font-semibold">Navigation</div>
      <nav className="grid gap-1">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: active ? "secondary" : "ghost" }),
                "w-full justify-start",
              )}
            >
              <Icon />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
