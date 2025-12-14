import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: notes } = await supabase
    .from("notifications")
    .select("id, type, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-foreground/70">
          Nightly earnings and system messages appear here.
        </p>
      </header>

      <section className="rounded border overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <th className="p-3">Title</th>
              <th className="p-3">Type</th>
              <th className="p-3">At</th>
              <th className="p-3">Read</th>
            </tr>
          </thead>
          <tbody>
            {(notes ?? []).map((n) => (
              <tr key={n.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{n.title}</div>
                  {n.body ? (
                    <div className="text-foreground/70 text-xs mt-1">{n.body}</div>
                  ) : null}
                </td>
                <td className="p-3 font-mono">{n.type}</td>
                <td className="p-3">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : "-"}
                </td>
                <td className="p-3">{n.read_at ? "Yes" : "No"}</td>
              </tr>
            ))}
            {(!notes || notes.length === 0) && (
              <tr>
                <td className="p-3 text-foreground/60" colSpan={4}>
                  No notifications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
