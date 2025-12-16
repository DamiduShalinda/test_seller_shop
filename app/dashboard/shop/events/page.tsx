import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ShopEventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "shop_owner") redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const barcodeQuery = String(params.barcode ?? "").trim();
  const statusQuery = String(params.status ?? "").trim();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const shopId = claimsData?.claims?.sub;
  if (!shopId) redirect("/auth/login");

  const { data } = await supabase
    .from("sale_events")
    .select("id, client_event_id, barcode, sold_price, occurred_at, received_at, status, reason")
    .eq("shop_id", shopId)
    .order("received_at", { ascending: false })
    .limit(500);

  const events = (data ?? []) as Array<{
    id: string;
    client_event_id: string;
    barcode: string;
    sold_price: number | null;
    occurred_at: string | null;
    received_at: string | null;
    status: string;
    reason: string | null;
  }>;

  const statuses = Array.from(new Set(events.map((x) => x.status))).sort();
  const filtered = events.filter((e) => {
    const matchesBarcode = barcodeQuery
      ? (e.barcode ?? "").toLowerCase().includes(barcodeQuery.toLowerCase())
      : true;
    const matchesStatus = statusQuery ? e.status === statusQuery : true;
    return matchesBarcode && matchesStatus;
  });

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Sale events</h1>
        <p className="text-sm text-foreground/70">
          Events show sync outcomes for offline sales (accepted / rejected / retried).
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-end">
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Barcode</span>
              <Input name="barcode" defaultValue={barcodeQuery} placeholder="e.g. 1234567890" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-foreground/70">Status</span>
              <select
                name="status"
                defaultValue={statusQuery}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" className="w-fit">
              Apply
            </Button>
            <Button asChild variant="ghost" className="w-fit">
              <Link href="/dashboard/shop/events">Reset</Link>
            </Button>
          </form>
          <div className="text-xs text-foreground/70">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{events.length}</span>
          </div>
        </div>

        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Barcode</th>
                <th className="p-3">Price</th>
                <th className="p-3">Occurred</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 font-mono">{e.barcode}</td>
                  <td className="p-3">{e.sold_price == null ? "-" : Number(e.sold_price).toFixed(2)}</td>
                  <td className="p-3">{e.occurred_at ? new Date(e.occurred_at).toLocaleString() : "-"}</td>
                  <td className="p-3 font-mono">{e.status}</td>
                  <td className="p-3">{e.reason ?? "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={5}>
                    No matching events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

