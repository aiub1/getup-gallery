import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AdminContext } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { enqueueDeleteObjects } from "@/lib/jobs/enqueue-delete-objects";
import { enqueueIndexFaces } from "@/lib/jobs/enqueue-index-faces";
import { signPhotoUploads, UploadLimitError, verifyUploadedObjects } from "@/lib/r2/sign-upload";
import { photoKeys } from "@/lib/upload/keys";
import { confirmUploadSchema, prepareUploadSchema } from "@/lib/upload/schemas";
import type { ConfirmResult, Failure, PrepareResult } from "@/lib/upload/types";

/*
 * Envio e exclusão de fotos pelo admin. As Server Actions (app/actions.ts)
 * são endpoints públicos: cada uma remonta o contexto com o JWT de quem
 * chamou, e tudo aqui escreve com esse JWT — a RLS do core decide ("insert
 * photos", "delete photos"). service_role só entra para enfileirar jobs.
 *
 * O fluxo de envio é o mesmo do galeria-web (linha em `photos` só depois dos
 * três arquivos no R2; id e chaves gerados no servidor), restrito ao evento
 * deste site.
 */

const fail = (error: string): Failure => ({ ok: false, error });

const INVALID = "Dados inválidos. Recarregue a página e tente de novo.";
const EVENT_NOT_FOUND = "Evento não encontrado.";
const SESSION_NOT_FOUND = "Sessão não encontrada neste evento.";
const PG_UNIQUE_VIOLATION = "23505";

/** O evento do site e, se houver, uma sessão dele. Lidos com o JWT do admin. */
async function checkEventAndSession(
  { supabase }: AdminContext,
  eventId: string,
  sessionId: string | null,
): Promise<string | null> {
  const { data: event, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("slug", serverEnv.EVENT_SLUG)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler evento: ${error.message}`);
  if (!event) return EVENT_NOT_FOUND;

  if (sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (sessionError) throw new Error(`Falha ao ler sessão: ${sessionError.message}`);
    if (!session) return SESSION_NOT_FOUND;
  }
  return null;
}

export async function prepareUpload(ctx: AdminContext, raw: unknown): Promise<PrepareResult> {
  const parsed = prepareUploadSchema.safeParse(raw);
  if (!parsed.success) return fail(INVALID);
  const { eventId, sessionId, photos } = parsed.data;

  const problem = await checkEventAndSession(ctx, eventId, sessionId);
  if (problem) return fail(problem);

  try {
    const prepared = await Promise.all(
      photos.map(async ({ clientId, originalBytes, webBytes, thumbBytes }) => {
        // O id e as chaves nascem aqui, nunca vêm do cliente.
        const photoId = randomUUID();
        const uploads = await signPhotoUploads(photoKeys(eventId, photoId), {
          original: originalBytes,
          web: webBytes,
          thumb: thumbBytes,
        });
        return { clientId, photoId, uploads };
      }),
    );
    return { ok: true, photos: prepared };
  } catch (error) {
    if (error instanceof UploadLimitError) return fail(INVALID);
    throw error;
  }
}

async function findOwnPhoto(ctx: AdminContext, photoId: string) {
  const { data, error } = await ctx.supabase
    .from("photos")
    .select("id, uploaded_by, status, contains_minors")
    .eq("id", photoId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler foto: ${error.message}`);
  return data;
}

export async function confirmUpload(ctx: AdminContext, raw: unknown): Promise<ConfirmResult> {
  const parsed = confirmUploadSchema.safeParse(raw);
  if (!parsed.success) return fail(INVALID);
  const input = parsed.data;

  const problem = await checkEventAndSession(ctx, input.eventId, input.sessionId);
  if (problem) return fail(problem);

  const indexFaces = serverEnv.INDEX_FACES === "true";
  let existing = await findOwnPhoto(ctx, input.photoId);

  if (!existing) {
    const keys = photoKeys(input.eventId, input.photoId);
    const problems = await verifyUploadedObjects(keys, {
      original: input.originalBytes,
      web: input.webBytes,
      thumb: input.thumbBytes,
    });
    if (problems.length > 0) return fail("Os arquivos enviados não conferem. Tente enviar de novo.");

    const { error } = await ctx.supabase.from("photos").insert({
      id: input.photoId,
      event_id: input.eventId,
      session_id: input.sessionId,
      uploaded_by: ctx.userId,
      storage_key: keys.original,
      web_key: keys.web,
      thumb_key: keys.thumb,
      width: input.width,
      height: input.height,
      bytes: input.originalBytes,
      taken_at: input.takenAt,
      contains_minors: input.containsMinors,
      // Este site só publica; foto privada é assunto do galeria-web.
      is_private: false,
      // Com menores: nunca indexada (CONTRATO §4). Sem menores: só entra na
      // fila do worker se INDEX_FACES estiver ligado; senão fica publicada
      // sem indexação.
      status: !input.containsMinors && indexFaces ? "pending" : "skipped",
    });

    if (error) {
      // Reenvio da mesma confirmação (idempotência): a linha já é nossa.
      if (error.code !== PG_UNIQUE_VIOLATION) throw new Error(`Falha ao publicar foto: ${error.message}`);
    }
    existing = await findOwnPhoto(ctx, input.photoId);
  }

  if (!existing || existing.uploaded_by !== ctx.userId) {
    return fail("Não foi possível publicar esta foto.");
  }

  const status = existing.status === "skipped" ? "skipped" : "pending";
  if (existing.contains_minors !== false || !indexFaces) return { ok: true, status, indexing: "not_applicable" };

  try {
    await enqueueIndexFaces(existing.id);
    return { ok: true, status, indexing: "queued" };
  } catch (error) {
    console.error("confirmUpload: falha ao enfileirar index_faces", { photoId: existing.id, error });
    return { ok: true, status, indexing: "failed" };
  }
}

export type DeleteResult = { ok: true; cleanup: "queued" | "failed" } | Failure;

const deleteSchema = z.object({ photoId: z.guid() });

export async function deletePhoto(ctx: AdminContext, raw: unknown): Promise<DeleteResult> {
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return fail(INVALID);
  const { photoId } = parsed.data;

  // Lê a linha (e as chaves) com o JWT do admin, restrita ao evento do site.
  const { data: photo, error: readError } = await ctx.supabase
    .from("photos")
    .select("id, storage_key, web_key, thumb_key, event:events!inner(slug)")
    .eq("id", photoId)
    .eq("event.slug", serverEnv.EVENT_SLUG)
    .maybeSingle();
  if (readError) throw new Error(`Falha ao ler foto: ${readError.message}`);
  if (!photo) return fail("Foto não encontrada.");

  // DELETE com o JWT: a policy "delete photos" só deixa admin (CONTRATO §8,
  // invariante 5). `.select()` confirma que a linha saiu de fato — sem
  // permissão, o Postgres devolve zero linhas, não um erro.
  const { data: deleted, error: deleteError } = await ctx.supabase
    .from("photos")
    .delete()
    .eq("id", photo.id)
    .select("id");
  if (deleteError) throw new Error(`Falha ao excluir foto: ${deleteError.message}`);
  if (!deleted || deleted.length === 0) return fail("Sua conta não pode excluir fotos.");

  try {
    await enqueueDeleteObjects(photo.id, [photo.storage_key, photo.web_key, photo.thumb_key]);
    return { ok: true, cleanup: "queued" };
  } catch (error) {
    // A foto já saiu do site; só os arquivos ficaram no bucket (privado).
    console.error("deletePhoto: falha ao enfileirar delete_objects", { photoId: photo.id, error });
    return { ok: true, cleanup: "failed" };
  }
}
