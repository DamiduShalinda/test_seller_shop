import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AdminToolsNav } from "./_components/admin-tools-nav";

export default async function AdminToolsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold">Admin tools</h1>
          <p className="text-sm text-muted-foreground">
            Pick a lens to zoom into roles, inventory, workflows, adjustments, or reviews.
          </p>
        </div>
        <AdminToolsNav />
      </header>

      <section className="rounded border p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Choose the right screen</h2>
            <p className="text-sm text-muted-foreground">
              Each tile below points to a focused experience—teams work faster when they land
              directly on the task they need.
            </p>
          </div>
          <Button size="sm" variant="outline">
            Hover to uncover the workflow
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded border border-dashed border-border p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">Users</p>
            <p className="text-sm text-muted-foreground">
              Role assignment, bootstrap secrets, and profile hygiene.
            </p>
          </div>
          <div className="rounded border border-dashed border-border p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">Inventory</p>
            <p className="text-sm text-muted-foreground">
              Barcode prep, stock tracking, and shop handovers.
            </p>
          </div>
          <div className="rounded border border-dashed border-border p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">Workflows</p>
            <p className="text-sm text-muted-foreground">
              Discounts, payouts, return approvals, and alert jobs.
            </p>
          </div>
          <div className="rounded border border-dashed border-border p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">Adjustments</p>
            <p className="text-sm text-muted-foreground">
              Price overrides, commission rules, lateness flags.
            </p>
          </div>
          <div className="rounded border border-dashed border-border p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">Reviews</p>
            <p className="text-sm text-muted-foreground">
              Rejected sale events, dispute resolution, audit trails.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Users</div>
          <div className="text-sm text-muted-foreground">
            Assign roles, color-code profiles, and keep onboarding secrets in one spot.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/users">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Inventory</div>
          <div className="text-sm text-muted-foreground">
            Unpack collected batches, prep barcodes, and move stock to shops meaningfully.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/inventory">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Workflows</div>
          <div className="text-sm text-muted-foreground">
            Review pending discounts, payouts, returns, and scheduled jobs.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/workflows">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Adjustments</div>
          <div className="text-sm text-muted-foreground">
            Slow-moving flags, commissions, overrides, and quantity edits live here.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/adjustments">Open</Link>
          </Button>
        </div>
        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Reviews</div>
          <div className="text-sm text-muted-foreground">
            Handle rejected sale events and open disputes, all audit logged.
          </div>
          <Button asChild size="sm" className="w-fit">
            <Link href="/dashboard/admin/tools/reviews">Open</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
