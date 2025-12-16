"use client";

import { useCallback, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { ResponsiveFormDrawer } from "@/components/form/responsive-form-drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/form/loading-button";

type CollectedBatchRow = {
  batch_id: string;
  quantity: number;
  status: string;
  created_at: string | null;
  product_name: string;
  seller_name: string;
  item_count: number;
};

function base32Encode(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let value = 0;
  let bits = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function generateBarcode(batchId: string) {
  const prefix = batchId.replace(/-/g, "").slice(0, 8);
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const randomToken = base32Encode(bytes).slice(0, 16);
  return `B${prefix}-${randomToken}`;
}

export function CollectedBatchBarcodesTool() {
  const supabase = useMemo(() => createClient(), []);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [batches, setBatches] = useState<CollectedBatchRow[]>([]);
  const [selected, setSelected] = useState<CollectedBatchRow | null>(null);
  const [existingBarcodes, setExistingBarcodes] = useState<string[]>([]);
  const [generatedBarcodes, setGeneratedBarcodes] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatusMessage(null);
    setSelected(null);
    setExistingBarcodes([]);
    setGeneratedBarcodes([]);

    const { data, error } = await supabase.rpc("rpc_admin_collected_batches", {
      p_limit: 50,
    });
    if (error) {
      setStatusMessage(error.message);
      setBatches([]);
      return;
    }
    setBatches((data ?? []) as CollectedBatchRow[]);
  }, [supabase]);

  async function run(key: string, fn: () => Promise<void>) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  }

  const openBatch = useCallback(
    async (row: CollectedBatchRow) => {
      setStatusMessage(null);
      setSelected(row);
      setGeneratedBarcodes([]);
      setExistingBarcodes([]);

      const { data, error } = await supabase.rpc("rpc_admin_batch_item_barcodes", {
        p_batch_id: row.batch_id,
        p_limit: 500,
      });
      if (error) {
        setStatusMessage(error.message);
        return;
      }
      setExistingBarcodes((data ?? []).map((x: { barcode: string }) => x.barcode));
    },
    [supabase],
  );

  const missingCount = Math.max(
    (selected?.quantity ?? 0) - (selected?.item_count ?? 0),
    0,
  );

  const generateMissing = useCallback(() => {
    if (!selected) return;
    const countToGenerate = missingCount;
    if (countToGenerate <= 0) {
      setGeneratedBarcodes([]);
      return;
    }
    const next = new Set<string>();
    while (next.size < countToGenerate) next.add(generateBarcode(selected.batch_id));
    setGeneratedBarcodes(Array.from(next));
  }, [missingCount, selected]);

  const createItems = useCallback(async () => {
    if (!selected) return;
    if (generatedBarcodes.length === 0) {
      setStatusMessage("Generate barcodes first");
      return;
    }
    setStatusMessage(null);
    const { error } = await supabase.rpc("rpc_admin_create_items", {
      p_batch_id: selected.batch_id,
      p_barcodes: generatedBarcodes,
      p_initial_status: "created",
    });
    if (error) {
      setStatusMessage(error.message);
      return;
    }
    setStatusMessage(`Created ${generatedBarcodes.length} items`);
    await refresh();
  }, [generatedBarcodes, refresh, selected, supabase]);

  const copyGenerated = useCallback(async () => {
    if (generatedBarcodes.length === 0) return;
    await navigator.clipboard.writeText(generatedBarcodes.join("\n"));
    setStatusMessage("Copied generated barcodes");
  }, [generatedBarcodes]);

  return (
    <ResponsiveFormDrawer
      title="Collected batches (barcodes)"
      description="Generate and create item barcodes for collected batches so collectors can hand over stock."
      trigger={
        <Button variant="secondary" onClick={() => run("refresh", refresh)}>
          Collected batches
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <LoadingButton
            loading={busyKey === "refresh"}
            onClick={() => run("refresh", refresh)}
            variant="outline"
            className="w-fit"
          >
            Refresh list
          </LoadingButton>
          {statusMessage ? (
            <div className="text-xs text-muted-foreground">{statusMessage}</div>
          ) : null}
        </div>

        <div className="rounded border overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">Seller</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Items</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((row) => (
                <tr key={row.batch_id} className="border-t">
                  <td className="p-3">{row.seller_name}</td>
                  <td className="p-3">{row.product_name}</td>
                  <td className="p-3">{row.quantity}</td>
                  <td className="p-3">
                    {row.item_count} / {row.quantity}
                  </td>
                  <td className="p-3 font-mono text-xs">{row.batch_id}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openBatch(row)}
                    >
                      Prepare
                    </Button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No collected batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="grid gap-3 rounded border p-3">
            <div className="text-sm">
              <div className="font-medium">
                {selected.product_name} — {selected.seller_name}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Batch: {selected.batch_id}
              </div>
              <div className="text-xs text-muted-foreground">
                Missing barcodes: {missingCount}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={generateMissing}
                disabled={missingCount <= 0}
              >
                Generate missing ({missingCount})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyGenerated}
                disabled={generatedBarcodes.length === 0}
              >
                Copy generated
              </Button>
              <LoadingButton
                loading={busyKey === "create"}
                onClick={() => run("create", createItems)}
                size="sm"
                variant="secondary"
                disabled={generatedBarcodes.length === 0}
              >
                Create items in DB
              </LoadingButton>
            </div>

            {generatedBarcodes.length > 0 ? (
              <Textarea
                value={generatedBarcodes.join("\n")}
                readOnly
                className="font-mono text-xs min-h-40"
              />
            ) : null}

            {existingBarcodes.length > 0 ? (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  Existing barcodes ({existingBarcodes.length})
                </summary>
                <Textarea
                  value={existingBarcodes.join("\n")}
                  readOnly
                  className="font-mono text-xs min-h-40 mt-2"
                />
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </ResponsiveFormDrawer>
  );
}

