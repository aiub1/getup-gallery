// Orquestração de UMA foto no navegador: converter → pedir URLs → enviar os
// três arquivos → confirmar. Sem React e sem DOM: as dependências entram por
// parâmetro, para o fluxo ser testado sem navegador.
import { UPLOAD_VARIANTS, type UploadVariant } from "./limits";
import type { ProcessedPhoto } from "./process-image";
import type { ConfirmResult, PrepareResult } from "./types";

export const MAX_PARALLEL_PHOTOS = 1;

export type ConfirmBody = {
  photoId: string;
  eventId: string;
  sessionId: string | null;
  containsMinors: boolean;
  isPrivate: boolean;
  minorIds: string[];
  width: number;
  height: number;
  takenAt: string | null;
  originalBytes: number;
  webBytes: number;
  thumbBytes: number;
};

export type PipelineDeps = {
  /** Já serializada pelo chamador: uma foto por vez no main thread. */
  process: (file: File) => Promise<ProcessedPhoto>;
  prepare: (input: unknown) => Promise<PrepareResult>;
  confirm: (input: unknown) => Promise<ConfirmResult>;
  put: (url: string, blob: Blob, contentType: string, onProgress: (loaded: number) => void) => Promise<void>;
};

export type PhotoJob = {
  clientId: string;
  file: File;
  eventId: string;
  sessionId: string | null;
  containsMinors: boolean | null;
  isPrivate: boolean;
  minorIds?: string[];
  /** Preenchido quando os arquivos já estão no R2 e só a confirmação falhou. */
  resume?: ConfirmBody;
};

export type Stage = "processing" | "uploading" | "confirming";

export type JobOutcome =
  | { ok: true; indexing: Extract<ConfirmResult, { ok: true }>["indexing"] }
  // `stage`: onde falhou (para diagnóstico); ausente se falhou antes de começar.
  | { ok: false; error: string; resume?: ConfirmBody; stage?: Stage };

export async function runPhotoJob(
  job: PhotoJob,
  deps: PipelineDeps,
  onStage: (stage: Stage, progress?: number) => void,
): Promise<JobOutcome> {
  // Sem valor padrão: "não respondido" nunca sai do navegador (CONTRATO §8, inv. 2).
  if (typeof job.containsMinors !== "boolean") {
    return { ok: false, error: "Responda se há criança ou adolescente na foto." };
  }
  const containsMinors = job.containsMinors;

  // Fora do try: se o envio terminou e só a confirmação falhou (rede), o
  // retry reaproveita os arquivos já no R2 — a confirmação é idempotente.
  let body = job.resume;
  let stage: Stage | undefined;
  const enter = (next: Stage, progress?: number) => {
    stage = next;
    onStage(next, progress);
  };

  try {
    if (!body) {
      enter("processing");
      const processed = await deps.process(job.file);
      const sizes = {
        originalBytes: processed.blobs.original.size,
        webBytes: processed.blobs.web.size,
        thumbBytes: processed.blobs.thumb.size,
      };

      const prepared = await deps.prepare({
        eventId: job.eventId,
        sessionId: job.sessionId,
        photos: [{ clientId: job.clientId, ...sizes }],
      });
      if (!prepared.ok) return { ok: false, error: prepared.error, stage };
      const photo = prepared.photos[0];
      if (!photo) return { ok: false, error: "Resposta inesperada do servidor." };

      enter("uploading", 0);
      const total = UPLOAD_VARIANTS.reduce((sum, v) => sum + processed.blobs[v].size, 0);
      const loaded: Record<UploadVariant, number> = { original: 0, web: 0, thumb: 0 };
      await Promise.all(
        UPLOAD_VARIANTS.map((variant) =>
          deps.put(photo.uploads[variant].url, processed.blobs[variant], photo.uploads[variant].contentType, (n) => {
            loaded[variant] = n;
            enter("uploading", (loaded.original + loaded.web + loaded.thumb) / total);
          }),
        ),
      );

      body = {
        photoId: photo.photoId,
        eventId: job.eventId,
        sessionId: job.sessionId,
        containsMinors,
        isPrivate: job.isPrivate,
        minorIds: containsMinors ? (job.minorIds ?? []) : [],
        width: processed.width,
        height: processed.height,
        takenAt: processed.takenAt,
        ...sizes,
      };
    }

    enter("confirming");
    const confirmed = await deps.confirm(body);
    if (!confirmed.ok) return { ok: false, error: confirmed.error, resume: body, stage };
    return { ok: true, indexing: confirmed.indexing };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha inesperada.", resume: body, stage };
  }
}

/** Executa `fn` de um em um, na ordem de chegada. */
export function createSerialRunner() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(fn, fn);
    tail = result.catch(() => undefined);
    return result;
  };
}

/** No máximo `limit` tarefas ao mesmo tempo; uma falha não interrompe as demais. */
export async function runPool<T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      try {
        await worker(item);
      } catch {
        /* o worker reporta o próprio erro */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}
