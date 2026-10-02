import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

// Cliente service_role — ignora RLS por completo.
//
// Uso restrito aos casos listados no CONTRATO (docs/CONTRATO.md), como soft
// delete de evento. NUNCA usar para ler dados em nome de um usuário: isso
// contorna a autorização que só a RLS decide (CONTRATO §1).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
