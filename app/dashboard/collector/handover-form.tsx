"use client";

import { useEffect, useMemo, useState } from "react";

import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";

type ShopOption = { id: string; name: string };

const DEFAULT_SHOP_STORAGE_KEY = "collector_default_shop_id";

export function CollectorHandoverForm({
  collectionId,
  shops,
  action,
}: {
  collectionId: string;
  shops: ShopOption[];
  action: (formData: FormData) => void;
}) {
  const firstShopId = shops[0]?.id ?? "";

  const initialShopId = useMemo(() => {
    if (typeof window === "undefined") return firstShopId;
    return window.localStorage.getItem(DEFAULT_SHOP_STORAGE_KEY) ?? firstShopId;
  }, [firstShopId]);

  const [shopId, setShopId] = useState(initialShopId);

  useEffect(() => {
    if (!shopId) return;
    window.localStorage.setItem(DEFAULT_SHOP_STORAGE_KEY, shopId);
  }, [shopId]);

  return (
    <form action={action} className="flex gap-2 items-center">
      <input type="hidden" name="collection_id" value={collectionId} />
      <select
        name="shop_id"
        value={shopId}
        onChange={(e) => setShopId(e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        required
      >
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Input
        name="handover_proof"
        className="h-8 text-xs"
        placeholder="proof reference"
        required
      />
      <SubmitButton size="sm" variant="outline" pendingText="Saving...">
        Mark
      </SubmitButton>
    </form>
  );
}

