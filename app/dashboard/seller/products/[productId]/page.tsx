import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyRole } from "@/lib/supabase/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/form/submit-button";
import { archiveProductAction, updateProductAction } from "../actions";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  archived_at: string | null;
  created_at: string | null;
};

export default async function SellerProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const role = await getMyRole();
  if (!role) redirect("/dashboard/onboarding");
  if (role !== "seller") redirect("/dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { productId } = await params;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, archived_at, created_at")
    .eq("id", productId)
    .eq("created_by", userId)
    .maybeSingle();

  if (!product) notFound();

  const p = product as ProductRow;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{p.name}</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/seller/products">Back</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 max-w-2xl">
            <form action={updateProductAction} className="grid gap-4">
              <input type="hidden" name="product_id" value={p.id} />
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={p.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={p.description ?? ""}
                />
              </div>
              <SubmitButton className="w-fit" pendingText="Saving...">
                Save changes
              </SubmitButton>
            </form>

            <form action={archiveProductAction}>
              <input type="hidden" name="product_id" value={p.id} />
              <SubmitButton
                variant="destructive"
                disabled={Boolean(p.archived_at)}
                pendingText="Archiving..."
              >
                {p.archived_at ? "Archived" : "Archive product"}
              </SubmitButton>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
