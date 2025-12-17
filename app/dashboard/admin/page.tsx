import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Keep the multi-role workflow moving—assign roles, approve collections, and
              step in when pricing or compliance needs extra attention.
            </p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/admin/tools">Open tools</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded border p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Daily focus</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Trace inventory from sellers through the shop and onto the sale. When exceptions
            pop up, use the tools panel to resolve discounts, payouts, or barcode creation
            quickly without leaving this view.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-dashed border-border p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Catalog health
              </p>
              <p className="text-sm">
                Confirm admin-owned products are priced and published correctly.
              </p>
            </div>
            <div className="rounded border border-dashed border-border p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Inventory flow
              </p>
              <p className="text-sm">
                Watch batch collection, barcode prep, and payout approvals for sellers.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded border p-6 space-y-4">
          <h3 className="text-base font-semibold">What’s next</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Ensure barcode generation is ready before the next shop handover.</li>
            <li>Review payout, return, and discount queues from the tools page.</li>
            <li>Keep commissions and overrides aligned with the latest pricing strategy.</li>
          </ul>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">High-level destinations</h2>
          <p className="text-sm text-muted-foreground">Jump to the workspace you need.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              Role management, workflow controls, and adjustments live here.
              <div>
                <Button asChild size="sm">
                  <Link href="/dashboard/admin/tools">Open tools</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              Review the catalog and add admin-owned offerings for shops to sell.
              <div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/dashboard/admin/products">View products</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              Inspect recent collections and step in on pending deliveries.
              <div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/dashboard/admin/batches">View batches</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              Access the system activity log whenever compliance questions arise.
              <div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/dashboard/admin/audit">View audit logs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
