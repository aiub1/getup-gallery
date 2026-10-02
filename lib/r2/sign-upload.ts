import "server-only";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env.server";
import { MAX_VARIANT_BYTES, UPLOAD_CONTENT_TYPE, UPLOAD_URL_EXPIRES_SECONDS, UPLOAD_VARIANTS, type UploadVariant } from "@/lib/upload/limits";
import type { PhotoKeys } from "@/lib/upload/keys";
import type { SignedUpload } from "@/lib/upload/types";
import { getR2Client } from "./client";

/*
 * URLs assinadas de ESCRITA no R2 (upload direto do navegador).
 *
 * ⚠️ POR QUE `photo_id` E CHAVES NASCEM NO SERVIDOR: uma URL assinada de PUT é
 * uma capacidade de escrita no bucket que não passa por RLS. Se o cliente
 * escolhesse a chave, um uploader poderia sobrescrever o arquivo de outra
 * foto (ou de outro evento) com uma URL legítima. Por isso esta API não
 * recebe strings de chave: recebe `PhotoKeys`, montado por `photoKeys()` a
 * partir de um `photo_id` que `prepareUpload` gerou com `crypto.randomUUID()`
 * e de um evento que a RLS confirmou (CONTRATO §7).
 *
 * `ContentType` e `ContentLength` entram na assinatura: o R2 recusa PUT com
 * tipo ou tamanho diferentes dos declarados, e os tamanhos foram limitados
 * antes de assinar. Depois do envio, `verifyUploadedObjects` confere com
 * HeadObject antes de qualquer linha entrar em `photos`.
 */

export type PhotoSizes = Record<UploadVariant, number>;


export class UploadLimitError extends Error {}

function assertSizes(sizes: PhotoSizes): void {
  for (const variant of UPLOAD_VARIANTS) {
    const size = sizes[variant];
    if (!Number.isInteger(size) || size <= 0 || size > MAX_VARIANT_BYTES[variant]) {
      throw new UploadLimitError(`Tamanho inválido para ${variant}: ${size}`);
    }
  }
}

export async function signPhotoUploads(
  keys: PhotoKeys,
  sizes: PhotoSizes,
): Promise<Record<UploadVariant, SignedUpload>> {
  assertSizes(sizes);
  const entries = await Promise.all(
    UPLOAD_VARIANTS.map(async (variant) => {
      const url = await getSignedUrl(
        getR2Client(),
        new PutObjectCommand({
          Bucket: serverEnv.R2_BUCKET,
          Key: keys[variant],
          ContentType: UPLOAD_CONTENT_TYPE,
          ContentLength: sizes[variant],
        }),
        {
          expiresIn: UPLOAD_URL_EXPIRES_SECONDS,
          // content-type não é assinado por padrão; content-length é.
          signableHeaders: new Set(["content-type"]),
        },
      );
      return [variant, { url, contentType: UPLOAD_CONTENT_TYPE }] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<UploadVariant, SignedUpload>;
}

/**
 * HeadObject nas três variantes. Devolve a lista de problemas (vazia = ok):
 * objeto ausente, tamanho diferente do declarado ou tipo diferente de WebP.
 */
export async function verifyUploadedObjects(keys: PhotoKeys, sizes: PhotoSizes): Promise<string[]> {
  const results = await Promise.all(
    UPLOAD_VARIANTS.map(async (variant): Promise<string | null> => {
      try {
        const head = await getR2Client().send(
          new HeadObjectCommand({ Bucket: serverEnv.R2_BUCKET, Key: keys[variant] }),
        );
        if (head.ContentLength !== sizes[variant]) return `${variant}: tamanho diferente do declarado`;
        if (head.ContentType !== UPLOAD_CONTENT_TYPE) return `${variant}: tipo diferente de ${UPLOAD_CONTENT_TYPE}`;
        return null;
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404) return `${variant}: arquivo não encontrado`;
        throw error;
      }
    }),
  );
  return results.filter((r): r is string => r !== null);
}
