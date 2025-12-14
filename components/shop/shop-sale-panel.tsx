"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type QueuedSaleEvent = {
  client_event_id: string;
  barcode: string;
  sold_price: number;
  occurred_at: string;
};

const STORAGE_KEY = "seller_shop.sale_queue.v1";

function loadQueue(): QueuedSaleEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedSaleEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedSaleEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function ShopSalePanel() {
  const supabase = useMemo(() => createClient(), []);

  const [barcode, setBarcode] = useState("");
  const [quotePrice, setQuotePrice] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [queue, setQueue] = useState<QueuedSaleEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    setQueue(loadQueue());
  }, []);

  useEffect(() => {
    saveQueue(queue);
  }, [queue]);

  const quote = useCallback(async () => {
    setQuoteError(null);
    setQuotePrice(null);
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("rpc_shop_quote_sale", {
        p_barcode: trimmed,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setQuoteError("Barcode not found");
        return;
      }
      if (row.status !== "in_shop") {
        setQuoteError(`Item status is ${row.status}, cannot sell`);
        return;
      }
      setQuotePrice(Number(row.sale_price));
    } catch (e: unknown) {
      setQuoteError(e instanceof Error ? e.message : "Failed to quote");
    } finally {
      setBusy(false);
    }
  }, [barcode, supabase]);

  const enqueue = useCallback((event: QueuedSaleEvent) => {
    setQueue((prev) => [event, ...prev]);
  }, []);

  const submitEvent = useCallback(
    async (event: QueuedSaleEvent) => {
      const { data, error } = await supabase.rpc("rpc_shop_submit_sale_event", {
        p_client_event_id: event.client_event_id,
        p_barcode: event.barcode,
        p_sold_price: event.sold_price,
        p_occurred_at: event.occurred_at,
        p_device_id: null,
      });
      if (error) throw error;
      return data as string | null;
    },
    [supabase],
  );

  const sellNow = useCallback(async () => {
    setQuoteError(null);
    const trimmed = barcode.trim();
    if (!trimmed) return;
    if (quotePrice == null) {
      setQuoteError("Quote first");
      return;
    }

    const event: QueuedSaleEvent = {
      client_event_id: crypto.randomUUID(),
      barcode: trimmed,
      sold_price: quotePrice,
      occurred_at: new Date().toISOString(),
    };

    setBusy(true);
    try {
      await submitEvent(event);
      setBarcode("");
      setQuotePrice(null);
      setSyncStatus("Sale recorded");
    } catch (e: unknown) {
      enqueue(event);
      setSyncStatus("Offline or rejected; queued for sync");
      setQuoteError(e instanceof Error ? e.message : "Queued");
    } finally {
      setBusy(false);
    }
  }, [barcode, quotePrice, enqueue, submitEvent]);

  const syncQueue = useCallback(async () => {
    if (queue.length === 0) return;
    setBusy(true);
    setSyncStatus(null);
    try {
      const remaining: QueuedSaleEvent[] = [];
      for (const event of queue.slice().reverse()) {
        try {
          await submitEvent(event);
        } catch {
          remaining.push(event);
        }
      }
      setQueue(remaining.reverse());
      setSyncStatus(
        remaining.length === 0
          ? "Sync complete"
          : `Sync partial: ${remaining.length} remaining`,
      );
    } finally {
      setBusy(false);
    }
  }, [queue, submitEvent]);

  useEffect(() => {
    const onOnline = () => {
      syncQueue().catch(() => {});
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncQueue]);

  return (
    <div className="space-y-6">
      <section className="rounded border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Sell by barcode</h2>
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm">Barcode</span>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="border rounded px-3 py-2 bg-background font-mono"
              placeholder="scan or type barcode"
            />
          </label>

          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={quote}
              disabled={busy}
              className="px-4 py-2 rounded border text-sm disabled:opacity-60"
            >
              Quote price
            </button>
            <button
              type="button"
              onClick={sellNow}
              disabled={busy || quotePrice == null}
              className="px-4 py-2 rounded bg-foreground text-background text-sm disabled:opacity-60"
            >
              Sell
            </button>
            {quotePrice != null && (
              <span className="text-sm text-foreground/70">
                Price: {quotePrice.toFixed(2)}
              </span>
            )}
          </div>

          {quoteError && (
            <div className="text-sm text-red-600">{quoteError}</div>
          )}
          {syncStatus && (
            <div className="text-sm text-foreground/70">{syncStatus}</div>
          )}
        </div>
      </section>

      <section className="rounded border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Offline queue</h2>
          <button
            type="button"
            onClick={syncQueue}
            disabled={busy || queue.length === 0}
            className="px-4 py-2 rounded border text-sm disabled:opacity-60"
          >
            Sync now
          </button>
        </div>
        <div className="text-sm text-foreground/70">
          Queued events: {queue.length}
        </div>
        {queue.length > 0 && (
          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-3">Barcode</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Occurred</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((e) => (
                  <tr key={e.client_event_id} className="border-t">
                    <td className="p-3 font-mono">{e.barcode}</td>
                    <td className="p-3">{e.sold_price.toFixed(2)}</td>
                    <td className="p-3">
                      {new Date(e.occurred_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
