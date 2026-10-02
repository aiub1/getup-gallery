import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env.server";
import { getR2Client } from "./client";

/*
 * URLs assinadas de leitura do R2 (bucket privado).
 *
 * ⚠️ REGRA DESTE ARQUIVO: só assine linhas que o BANCO acabou de devolver —
 * pelas funções public_* (visitante) ou por uma consulta com o JWT do admin.
 * A URL assinada não passa por regra nenhuma: assinar uma chave que o banco
 * não liberou transforma o bucket privado numa porta lateral.
 *
 * Por isso a API recebe LINHAS, nunca strings soltas vindas do cliente.
 * Variantes assinadas: `thumb` e `web`. O original nunca é assinado aqui.
 */

export type PhotoVariant = "thumb" | "web";
export type SignablePhoto = { id: string; thumb_key: string; web_key: string };

const EXPIRES_IN_SECONDS = 30 * 60;
// A mesma foto gera a mesma URL dentro de uma janela fixa, para o navegador
// reaproveitar o cache: validade efetiva entre 20 e 30 minutos.
const SIGNING_WINDOW_MS = 10 * 60 * 1000;
const DOWNLOAD_EXPIRES_IN_SECONDS = 60;

export function signingWindowStart(now: number): Date {
  return new Date(Math.floor(now / SIGNING_WINDOW_MS) * SIGNING_WINDOW_MS);
}

function keyFor(photo: SignablePhoto, variant: PhotoVariant): string {
  const key = variant === "thumb" ? photo.thumb_key : photo.web_key;
  if (typeof key !== "string" || key.length === 0) {
    throw new Error(`Foto ${photo.id} sem chave para a variante "${variant}"`);
  }
  return key;
}

/** photo.id → URL assinada (GET) da variante pedida. */
export async function signPhotoUrls(
  photos: readonly SignablePhoto[],
  variant: PhotoVariant,
  now: number = Date.now(),
): Promise<Map<string, string>> {
  const signingDate = signingWindowStart(now);
  const keyed = photos.map((photo) => ({ id: photo.id, key: keyFor(photo, variant) }));
  const entries = await Promise.all(
    keyed.map(async ({ id, key }) => {
      const url = await getSignedUrl(
        getR2Client(),
        new GetObjectCommand({
          Bucket: serverEnv.R2_BUCKET,
          Key: key,
          ResponseCacheControl: "private, max-age=600",
        }),
        { expiresIn: EXPIRES_IN_SECONDS, signingDate },
      );
      return [id, url] as const;
    }),
  );
  return new Map(entries);
}

/** Nome de arquivo seguro para Content-Disposition: só [a-z0-9-]. */
export function downloadFileName(parts: readonly (string | null | undefined)[]): string {
  const slug = parts
    .filter((part): part is string => Boolean(part))
    .map((part) =>
      part
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return `${slug || "foto"}.webp`;
}

/** URL curta (60 s) da versão web que o navegador salva em vez de abrir. */
export async function signPhotoDownload(photo: SignablePhoto, fileName: string): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: serverEnv.R2_BUCKET,
      Key: keyFor(photo, "web"),
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
      ResponseContentType: "image/webp",
    }),
    { expiresIn: DOWNLOAD_EXPIRES_IN_SECONDS },
  );
}
