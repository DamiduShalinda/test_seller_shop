import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              Seller Shop
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Suspense>
              <AuthButton />
            </Suspense>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Inventory, pricing, and sales — by role.
            </h1>
            <p className="text-muted-foreground">
              Seller Shop tracks items from seller → batch → shop → sale with
              role separation and an audit-friendly workflow.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seller</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Create batches, manage discounts/returns, and track wallet
                payouts.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Collector</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Record collections and handovers with proof references.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shop</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Scan barcodes before sales. Queue offline events and sync
                safely.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Assign roles and audit the full lifecycle across the system.
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
