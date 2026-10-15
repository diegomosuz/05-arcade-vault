import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente con la clave secreta: ignora RLS. Solo para Server Actions que ya han
// verificado la sesión y validado los datos. Nunca importar desde código de cliente.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY (ver .env.example)");

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
