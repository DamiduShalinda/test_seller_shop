import type { SupabaseClient } from "@supabase/supabase-js";

type NameRow = { id: string; name: string };

export async function getUserDisplayNameMap(
  supabase: SupabaseClient,
  userIds: Array<string | null | undefined>,
) {
  const ids = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  );

  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const [admins, sellers, collectors, shops] = await Promise.all([
    supabase.from("admins").select("id, name").in("id", ids),
    supabase.from("sellers").select("id, name").in("id", ids),
    supabase.from("collectors").select("id, name").in("id", ids),
    supabase.from("shops").select("id, name").in("id", ids),
  ]);

  for (const row of (admins.data ?? []) as NameRow[]) map.set(row.id, row.name);
  for (const row of (sellers.data ?? []) as NameRow[])
    map.set(row.id, map.get(row.id) ?? row.name);
  for (const row of (collectors.data ?? []) as NameRow[])
    map.set(row.id, map.get(row.id) ?? row.name);
  for (const row of (shops.data ?? []) as NameRow[])
    map.set(row.id, map.get(row.id) ?? row.name);

  return map;
}

