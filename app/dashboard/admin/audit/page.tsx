import { createClient } from "@/lib/supabase/server";
import { getUserDisplayNameMap } from "@/lib/supabase/user-display-name";

type AuditRow = {
  id: string;
  entity: string;
  action: string;
  actor_id: string | null;
  created_at: string | null;
};

export default async function AdminAuditPage() {
  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audit_logs")
    .select("id, entity, action, actor_id, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const actorNameById = await getUserDisplayNameMap(
    supabase,
    (audit ?? []).map((a) => a.actor_id),
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Audit</h1>
        <p className="text-sm text-muted-foreground">Latest audit log entries.</p>
      </header>

      <section className="rounded border overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <th className="p-3">Entity</th>
              <th className="p-3">Action</th>
              <th className="p-3">Actor</th>
              <th className="p-3">At</th>
            </tr>
          </thead>
          <tbody>
            {((audit ?? []) as AuditRow[]).map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-mono">{a.entity}</td>
                <td className="p-3 font-mono">{a.action}</td>
                <td className="p-3">{actorNameById.get(a.actor_id ?? "") ?? "-"}</td>
                <td className="p-3">
                  {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
            {(!audit || audit.length === 0) && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  No audit logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
