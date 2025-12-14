import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account setup</h1>
      <p className="text-sm text-foreground/70">
        Your account exists in Supabase Auth, but your app role isn’t set yet.
        Ask an admin to assign your role (Admin dashboard → “Set user role”).
      </p>
      <div className="rounded border p-4 bg-muted/20">
        <div className="text-sm font-medium">Your user id</div>
        <pre className="text-xs mt-2 p-3 rounded border bg-background overflow-auto">
          {userId ?? "Not signed in"}
        </pre>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/dashboard">Refresh</Link>
        </Button>
      </div>
    </div>
  );
}
