import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  /** há sessão válida (qualquer conta) */
  signedIn: boolean;
  /** conta ativa com papel admin — só muda o que a TELA oferece */
  isAdmin: boolean;
  userId: string | null;
};

const VISITOR: Viewer = { signedIn: false, isAdmin: false, userId: null };

// Quem está olhando. `isAdmin` aqui decide só quais botões aparecem; quem
// autoriza de fato o envio e a exclusão é o banco (policies "insert photos" e
// "delete photos" do core), com o JWT desta mesma sessão.
export async function getViewer(supabase?: SupabaseClient<Database>): Promise<Viewer> {
  const client = supabase ?? (await createClient());
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return VISITOR;

  const { data: profile } = await client.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle();
  return {
    signedIn: true,
    isAdmin: profile?.is_active === true && profile.role === "admin",
    userId: user.id,
  };
}

export type AdminContext = { supabase: SupabaseClient<Database>; userId: string };

/** Para Server Actions de admin: contexto com o JWT do admin, ou null. */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer.isAdmin || !viewer.userId) return null;
  return { supabase, userId: viewer.userId };
}
