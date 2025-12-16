import { AdminToolsNav } from "../_components/admin-tools-nav";
import { AdminTools } from "@/components/admin/admin-tools";

export default function AdminToolsInventoryPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin tools · Inventory</h1>
        <AdminToolsNav activeHref="/dashboard/admin/tools/inventory" />
      </header>
      <AdminTools section="inventory" />
    </div>
  );
}

