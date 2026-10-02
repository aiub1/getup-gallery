// Limites do upload. Módulo puro (sem "server-only"): o navegador usa os
// mesmos números para recusar cedo, mas quem decide é o servidor, que os
// repete antes de assinar (lib/r2/sign-upload.ts) e antes de inserir a linha.

export type UploadVariant = "original" | "web" | "thumb";

export const UPLOAD_VARIANTS: readonly UploadVariant[] = ["original", "web", "thumb"];

export const MAX_PHOTOS_PER_PREPARE = 20;

/** Tamanho máximo, em bytes, do arquivo já convertido para WebP. */
export const MAX_VARIANT_BYTES: Record<UploadVariant, number> = {
  original: 15 * 1024 * 1024,
  web: 3 * 1024 * 1024,
  thumb: 300 * 1024,
};

/** Arquivo escolhido pelo usuário, antes da conversão. */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_SOURCE_TYPES = ["image/jpeg", "image/png"] as const;

export const UPLOAD_CONTENT_TYPE = "image/webp";

/** Referência do acervo: lado maior, sem ampliar, e qualidade do WebP. */
export const VARIANT_SPEC = {
  original: { maxSide: null, quality: 0.85 },
  web: { maxSide: 2048, quality: 0.82 },
  thumb: { maxSide: 400, quality: 0.75 },
} as const satisfies Record<UploadVariant, { maxSide: number | null; quality: number }>;

/** Limite do formato WebP (16383 px por lado). */
export const MAX_IMAGE_SIDE = 16383;

/** Validade da URL assinada de PUT. */
export const UPLOAD_URL_EXPIRES_SECONDS = 10 * 60;
