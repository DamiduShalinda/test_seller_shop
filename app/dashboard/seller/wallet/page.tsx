import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { requestPayoutAction } from "../wallet-actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";

export default async function SellerWalletPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: wallet } = await supabase
    .from("wallets")
    .select("seller_id, balance")
    .eq("seller_id", userId)
    .maybeSingle();

  const { data: tx } = await supabase
    .from("wallet_transactions")
    .select("id, sale_id, amount, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, status, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Wallet & payouts</h1>
        <p className="text-sm text-foreground/70">
          Sales credit your wallet; request payouts here. Admin approves and marks
          paid.
        </p>
      </header>

      <section className="rounded border p-5 space-y-3">
        <h2 className="text-lg font-semibold">Balance</h2>
        <div className="text-3xl font-semibold">
          {(wallet?.balance ?? 0).toFixed(2)}
        </div>
        <form action={requestPayoutAction} className="flex gap-3 items-end">
          <label className="grid gap-1">
            <span className="text-sm">Request payout amount</span>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
          </label>
          <SubmitButton pendingText="Requesting...">
            Request
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent earnings</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Amount</th>
                <th className="p-3">At</th>
              </tr>
            </thead>
            <tbody>
              {(tx ?? []).map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{Number(t.amount).toFixed(2)}</td>
                  <td className="p-3">
                    {t.created_at ? new Date(t.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {(!tx || tx.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={2}>
                    No earnings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payout requests</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Requested</th>
              </tr>
            </thead>
            <tbody>
              {(payouts ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{Number(p.amount).toFixed(2)}</td>
                  <td className="p-3 font-mono">{p.status}</td>
                  <td className="p-3">
                    {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {(!payouts || payouts.length === 0) && (
                <tr>
                  <td className="p-3 text-foreground/60" colSpan={3}>
                    No payout requests yet.
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
