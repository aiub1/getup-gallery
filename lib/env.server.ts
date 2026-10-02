import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  // Só desenvolvimento: endpoint S3 alternativo (MinIO local). Vazio = R2.
  R2_ENDPOINT: z.union([z.string().url(), z.literal("")]).optional(),
  // Evento que este site mostra. Um site, um evento.
  EVENT_SLUG: z.string().min(1).default("getup-2026"),
  // "true" enfileira index_faces para fotos sem menores (CONTRATO §4).
  // Padrão desligado: ver README, "Indexação facial".
  INDEX_FACES: z.enum(["true", "false"]).default("false"),
});

const serverResult = serverSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  EVENT_SLUG: process.env.EVENT_SLUG || undefined,
  INDEX_FACES: process.env.INDEX_FACES || undefined,
});

if (!serverResult.success) {
  throw new Error(
    `Variáveis de ambiente de servidor inválidas:\n${serverResult.error.message}`
  );
}

export const serverEnv = serverResult.data;
