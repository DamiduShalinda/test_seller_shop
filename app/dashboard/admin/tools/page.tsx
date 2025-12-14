import { AdminTools } from "@/components/admin/admin-tools";

export default async function AdminToolsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin tools</h1>
        <p className="text-sm text-muted-foreground">
          Role assignment, barcode creation, stocking, workflow decisions, and admin jobs.
        </p>
      </header>
      <AdminTools />
    </div>
  );
}

