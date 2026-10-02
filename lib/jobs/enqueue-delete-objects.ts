import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Enfileira a limpeza dos arquivos no R2 depois que o admin excluiu a foto
 * (CONTRATO §4: job `delete_objects`, payload `{ keys }`). `jobs` é revogada
 * para o JWT do usuário, então o servidor é o único caminho.
 *
 * As chaves vêm da LINHA que o banco devolveu ao admin antes do DELETE, nunca
 * do navegador. Por garantia, só passam chaves no formato fixo do CONTRATO §7
 * e da própria foto: uma chave fora disso é recusada, não enfileirada.
 *
 * Só escreve `{ type, payload }`; status e o resto são do worker.
 */

const KEY_PATTERN = /^events\/[0-9a-f-]{36}\/photos\/([0-9a-f-]{36})\/(original|web|thumb)\.webp$/;

export function deletableKeys(photoId: string, keys: readonly string[]): string[] {
  return [...new Set(keys)].filter((key) => KEY_PATTERN.exec(key)?.[1] === photoId);
}

export async function enqueueDeleteObjects(photoId: string, keys: readonly string[]): Promise<{ enqueued: number }> {
  const safe = deletableKeys(photoId, keys);
  if (safe.length === 0) return { enqueued: 0 };

  const { error } = await createAdminClient()
    .from("jobs")
    .insert({ type: "delete_objects", payload: { keys: safe } });
  if (error) throw new Error(`enqueueDeleteObjects: falha ao inserir job (${error.code})`);
  return { enqueued: safe.length };
}
