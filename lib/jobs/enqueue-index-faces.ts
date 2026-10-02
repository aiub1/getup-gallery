import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Um dos dois arquivos (com enqueue-delete-objects.ts) que importam o cliente
 * service_role (o CI barra qualquer outro). `jobs` está revogada para o JWT do
 * usuário (`revoke all on jobs from anon, authenticated`), então o servidor é
 * o único caminho para enfileirar.
 *
 * Esta função recebe APENAS o `photo_id`. Quem diz se a foto pode ser
 * indexada é o banco: ela relê a linha com service_role e só enfileira com
 * `contains_minors === false` e `deleted_at` nulo. Nenhum argumento do
 * chamador influencia a decisão. É a primeira das três travas do CONTRATO §4
 * (as outras: worker e trigger em photo_faces).
 *
 * Só escreve em `jobs` `{ type, payload }`; `status` e o resto ficam com os
 * defaults do banco (a web nunca atualiza status, CONTRATO §4).
 */

export type EnqueueResult =
  | { enqueued: true }
  | { enqueued: false; reason: "not_found" | "not_indexable" | "already_queued" };

export async function enqueueIndexFaces(photoId: string): Promise<EnqueueResult> {
  const admin = createAdminClient();

  const { data: photo, error: photoError } = await admin
    .from("photos")
    .select("id, contains_minors, deleted_at")
    .eq("id", photoId)
    .maybeSingle();
  if (photoError) throw new Error(`enqueueIndexFaces: falha ao ler a foto (${photoError.code})`);
  if (!photo) return { enqueued: false, reason: "not_found" };
  if (photo.contains_minors !== false || photo.deleted_at !== null) {
    return { enqueued: false, reason: "not_indexable" };
  }

  const { data: existing, error: existingError } = await admin
    .from("jobs")
    .select("id")
    .eq("type", "index_faces")
    .eq("payload->>photo_id", photo.id)
    .limit(1);
  if (existingError) throw new Error(`enqueueIndexFaces: falha ao ler jobs (${existingError.code})`);
  if (existing && existing.length > 0) return { enqueued: false, reason: "already_queued" };

  const { error: insertError } = await admin
    .from("jobs")
    .insert({ type: "index_faces", payload: { photo_id: photo.id } });
  if (insertError) throw new Error(`enqueueIndexFaces: falha ao inserir job (${insertError.code})`);

  return { enqueued: true };
}
