import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { Button } from "@/components/ui/button";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  archived_at: string | null;
  created_at: string | null;
};

export default async function SellerProductsPage() {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, archived_at, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  const active = ((products ?? []) as ProductRow[]).filter((p) => !p.archived_at);
  const archived = ((products ?? []) as ProductRow[]).filter((p) => p.archived_at);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted-foreground">
          Collectors now capture new products while they are at your shop. You can still review
          and manage the products below, but contact your assigned collector to add new ones.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My products</h2>
          <Button asChild variant="outline">
            <Link href="/dashboard/seller">Go to batches</Link>
          </Button>
        </div>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Created</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="p-3">Active</td>
                  <td className="p-3 text-right">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/seller/products/${p.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={4}>
                    No products yet. Ask your collector to add one for you.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {archived.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Archived</h2>
          <div className="rounded border overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Archived</th>
                </tr>
              </thead>
              <tbody>
                {archived.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">
                    <div className="font-medium">{p.name}</div>
                    </td>
                    <td className="p-3">
                      {p.archived_at ? new Date(p.archived_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
