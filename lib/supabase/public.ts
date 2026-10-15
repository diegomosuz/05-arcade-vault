import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente de solo lectura sin cookies ni sesión: permite usarlo dentro de
// funciones con "use cache" (lib/supabase/server.ts lee cookies y no puede).
// Solo accede a datos públicos que RLS ya expone a `anon`.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
