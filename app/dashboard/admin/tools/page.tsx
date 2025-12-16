import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AdminToolsNav } from "./_components/admin-tools-nav";

export default async function AdminToolsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin tools</h1>
        <p className="text-sm text-muted-foreground">
          Split into sections for faster access.
        </p>
        <AdminToolsNav />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Users</div>
          <div className="text-sm text-muted-foreground">Assign roles and profiles.</div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/users">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Inventory</div>
          <div className="text-sm text-muted-foreground">
            Barcodes, stock to shops, collected batches.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/inventory">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Workflows</div>
          <div className="text-sm text-muted-foreground">
            Discounts, payouts, returns, jobs.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/workflows">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Adjustments</div>
          <div className="text-sm text-muted-foreground">
            Slow-moving, commissions, overrides.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/adjustments">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Reviews</div>
          <div className="text-sm text-muted-foreground">
            Rejected events and disputes.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/reviews">Open</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
