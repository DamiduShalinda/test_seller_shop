import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { createDisputeAction } from "./actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { Label } from "@/components/ui/label";

export default async function SellerDisputesPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: disputes } = await supabase
    .from("disputes")
    .select("id, entity, entity_id, message, status, admin_note, created_at, updated_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Disputes</h1>
        <p className="text-sm text-foreground/70">
          Raise a dispute for a batch, item, sale, payout, etc. Admin resolves with
          an audit trail.
        </p>
      </header>

      <div>
        <ResponsiveFormDrawer
          title="Create dispute"
          description="Raise a dispute with an audit trail."
          trigger={<Button>Create dispute</Button>}
        >
          <form action={createDisputeAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="entity">Entity</Label>
              <select id="entity" name="entity" className="border rounded px-3 py-2 bg-background">
                <option value="batches">batches</option>
                <option value="items">items</option>
                <option value="sales">sales</option>
                <option value="payouts">payouts</option>
                <option value="discounts">discounts</option>
                <option value="collections">collections</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entity_id">Entity reference</Label>
              <Input id="entity_id" name="entity_id" className="font-mono text-sm" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" required />
            </div>
            <SubmitButton className="w-fit" pendingText="Submitting...">
              Submit dispute
            </SubmitButton>
          </form>
        </ResponsiveFormDrawer>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My disputes</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Entity</th>
                <th className="p-3">Message</th>
                <th className="p-3">Status</th>
                <th className="p-3">Admin note</th>
              </tr>
            </thead>
            <tbody>
              {(disputes ?? []).map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">
                    <div className="font-mono">{d.entity}</div>
                  </td>
                  <td className="p-3">{d.message}</td>
                  <td className="p-3 font-mono">{d.status}</td>
                  <td className="p-3">{d.admin_note ?? "-"}</td>
                </tr>
              ))}
              {(!disputes || disputes.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={4}>
                    No disputes.
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
