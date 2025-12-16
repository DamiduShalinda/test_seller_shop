import { AdminToolsNav } from "../_components/admin-tools-nav";
import { AdminTools } from "@/components/admin/admin-tools";

export default function AdminToolsUsersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin tools · Users</h1>
        <AdminToolsNav activeHref="/dashboard/admin/tools/users" />
      </header>
      <AdminTools section="users" />
    </div>
  );
}

