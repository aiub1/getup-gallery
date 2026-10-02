import type { UploadVariant } from "./limits";

// Tipos de resposta das Server Actions de /enviar. Arquivo sem "server-only":
// o navegador também os importa (só como tipo).

export type Failure = { ok: false; error: string };

export type SignedUpload = {
  url: string;
  contentType: "image/webp";
};

export type PreparedPhoto = {
  clientId: string;
  photoId: string;
  uploads: Record<UploadVariant, SignedUpload>;
};

export type PrepareResult = { ok: true; photos: PreparedPhoto[] } | Failure;

export type ConfirmResult =
  | {
      ok: true;
      status: "pending" | "skipped";
      /** queued: job criado · not_applicable: com menores, sem indexação · failed: publicada, job não criado */
      indexing: "queued" | "not_applicable" | "failed";
    }
  | Failure;

export type CreatedRef = { id: string; name: string; slug?: string; eventDate?: string };
export type CreateResult = { ok: true; item: CreatedRef } | Failure;
