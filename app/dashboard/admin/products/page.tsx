import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/form/submit-button";
import { getUserDisplayNameMap } from "@/lib/supabase/user-display-name";
import { createProductAsAdminAction } from "./actions";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  archived_at: string | null;
  created_at: string | null;
};

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, created_by, archived_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const ownerNameById = await getUserDisplayNameMap(
    supabase,
    (products ?? []).map((p) => p.created_by),
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted-foreground">
          Active products are visible across the app. Archived products remain for history.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProductAsAdminAction} className="grid gap-4 max-w-2xl">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" />
            </div>
            <SubmitButton className="w-fit" pendingText="Creating...">
              Create product
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latest products (100)</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {((products ?? []) as ProductRow[]).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">{ownerNameById.get(p.created_by ?? "") ?? "-"}</td>
                  <td className="p-3">{p.archived_at ? "Archived" : "Active"}</td>
                  <td className="p-3">
                    {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={4}>
                    No products.
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
