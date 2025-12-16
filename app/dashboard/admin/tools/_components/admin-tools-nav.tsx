import Link from "next/link";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard/admin/tools/users", label: "Users" },
  { href: "/dashboard/admin/tools/inventory", label: "Inventory" },
  { href: "/dashboard/admin/tools/workflows", label: "Workflows" },
  { href: "/dashboard/admin/tools/adjustments", label: "Adjustments" },
  { href: "/dashboard/admin/tools/reviews", label: "Reviews" },
] as const;

export function AdminToolsNav({ activeHref }: { activeHref?: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "inline-flex items-center rounded border px-3 py-1.5 text-sm",
            activeHref === item.href
              ? "bg-muted/40 text-foreground"
              : "bg-background hover:bg-muted/30 text-foreground/80",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

