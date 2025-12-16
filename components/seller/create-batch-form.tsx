"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createBatchActionWithState } from "@/app/dashboard/seller/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/form/submit-button";

type ProductOption = { id: string; name: string };

export function CreateBatchForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(createBatchActionWithState, {
    ok: false,
  });

  useEffect(() => {
    if (!state.submittedAt) return;
    if (state.ok) router.refresh();
  }, [router, state.ok, state.submittedAt]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="product_id">Product</Label>
        <select id="product_id" name="product_id" className="border rounded px-3 py-2 bg-background">
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="base_price">Base price</Label>
        <Input id="base_price" name="base_price" type="number" step="0.01" min="0" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input id="quantity" name="quantity" type="number" min="1" required />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : state?.ok ? (
        <p className="text-sm text-muted-foreground">Batch created.</p>
      ) : null}
      <SubmitButton className="w-fit" pendingText="Creating...">
        Create batch
      </SubmitButton>
    </form>
  );
}
