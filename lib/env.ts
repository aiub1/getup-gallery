import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Base para montar redirectTo de e-mails do Supabase Auth (recuperação de
  // senha). Sem protocolo/porta implícitos — precisa vir completa.
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

const publicResult = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!publicResult.success) {
  throw new Error(
    `Variáveis de ambiente públicas inválidas:\n${publicResult.error.message}`
  );
}

export const publicEnv = publicResult.data;
