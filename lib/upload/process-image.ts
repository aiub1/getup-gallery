// Conversão no NAVEGADOR (CONTRATO §1): decodifica, aplica a orientação do
// EXIF, gera original/web/thumb em WebP e descarta os metadados. Não importa
// nada de servidor.
//
// Por que o EXIF some: o WebP sai de um canvas, que só carrega pixels. Nada
// (GPS, modelo da câmera, data) é copiado para o arquivo novo. Como trava, o
// resultado é inspecionado e o envio é recusado se aparecer bloco EXIF/XMP.
//
// `taken_at` é lido do arquivo ORIGINAL antes de reencodar.
import exifr from "exifr/dist/full.esm.mjs";
import {
  ACCEPTED_SOURCE_TYPES,
  MAX_IMAGE_SIDE,
  MAX_SOURCE_BYTES,
  UPLOAD_CONTENT_TYPE,
  VARIANT_SPEC,
  type UploadVariant,
} from "./limits";
import { parseTakenAt } from "./taken-at";
import { isWebp, webpHasMetadata } from "./webp";
import { encodeWebpWasm } from "./webp-wasm";

export class ImageProcessError extends Error {}
/** O navegador não sabe gerar WebP (canvas devolveu outro formato). */
export class WebpUnsupportedError extends ImageProcessError {
  constructor() {
    super("Este navegador não consegue gerar imagens WebP. Use o Chrome, o Edge ou o Firefox.");
  }
}

export type ProcessedPhoto = {
  blobs: Record<UploadVariant, Blob>;
  width: number;
  height: number;
  takenAt: string | null;
};

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: AnyCanvas): Ctx2D {
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) throw new ImageProcessError("Não foi possível processar a imagem neste navegador.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

async function toBlob(canvas: AnyCanvas, type: string, quality: number): Promise<Blob | null> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }
  return canvas.convertToBlob({ type, quality });
}

function release(canvas: AnyCanvas): void {
  // Devolve a memória do bitmap de backing sem esperar o GC.
  canvas.width = 0;
  canvas.height = 0;
}

/** Cede o main thread entre etapas para a página não travar. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Preenchido por `canEncodeWebp()`: false = o canvas deste navegador não gera
// WebP (WebKit) e vamos direto ao encoder WASM, sem gastar um PNG inteiro.
let nativeWebp: boolean | undefined;

async function encodeWebp(canvas: AnyCanvas, quality: number): Promise<Blob> {
  let blob: Blob | null = null;
  if (nativeWebp !== false) {
    blob = await toBlob(canvas, UPLOAD_CONTENT_TYPE, quality);
    // Alguns navegadores devolvem PNG quando não sabem gerar WebP.
    if (blob && blob.type !== UPLOAD_CONTENT_TYPE) blob = null;
  }
  if (!blob) {
    try {
      const { width, height } = canvas;
      blob = await encodeWebpWasm(context(canvas).getImageData(0, 0, width, height), quality);
    } catch {
      throw new WebpUnsupportedError();
    }
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (!isWebp(bytes)) throw new WebpUnsupportedError();
  if (webpHasMetadata(bytes)) {
    throw new ImageProcessError("O arquivo gerado ainda contém metadados. O envio foi bloqueado.");
  }
  return blob;
}

/** Lado maior limitado a `maxSide`, sem ampliar. `null` = resolução cheia. */
function fitSize(width: number, height: number, maxSide: number | null): { w: number; h: number } {
  if (maxSide === null) return { w: width, h: height };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

async function renderVariant(bitmap: ImageBitmap, variant: UploadVariant): Promise<Blob> {
  const spec = VARIANT_SPEC[variant];
  const { w, h } = fitSize(bitmap.width, bitmap.height, spec.maxSide);
  const canvas = makeCanvas(w, h);
  try {
    context(canvas).drawImage(bitmap, 0, 0, w, h);
    return await encodeWebp(canvas, spec.quality);
  } finally {
    release(canvas);
  }
}

/** `taken_at` (ISO UTC) lido do EXIF do arquivo original, ou null. */
export async function readTakenAt(file: Blob | Uint8Array): Promise<string | null> {
  try {
    // reviveValues:false → strings cruas; um Date "revivido" seria
    // interpretado no fuso do navegador, e não no da igreja.
    const tags = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "OffsetTimeOriginal"],
      reviveValues: false,
    });
    return parseTakenAt(tags?.DateTimeOriginal, tags?.OffsetTimeOriginal);
  } catch {
    return null; // sem EXIF legível: taken_at fica nulo
  }
}

/** Mensagem para o usuário se o arquivo não serve, ou null. */
export function validateSourceFile(file: File): string | null {
  if (!(ACCEPTED_SOURCE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não aceito. Envie JPG ou PNG.";
  }
  if (file.size > MAX_SOURCE_BYTES) return "Arquivo maior que 20 MB.";
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

export async function processImage(file: File): Promise<ProcessedPhoto> {
  const invalid = validateSourceFile(file);
  if (invalid) throw new ImageProcessError(invalid);

  const takenAt = await readTakenAt(file);
  await yieldToMain();

  let bitmap: ImageBitmap;
  try {
    // 'from-image' aplica a rotação do EXIF; depois disso o EXIF é descartado.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageProcessError("Não foi possível ler esta imagem.");
  }

  try {
    if (Math.max(bitmap.width, bitmap.height) > MAX_IMAGE_SIDE) {
      throw new ImageProcessError("A imagem é grande demais (lado maior que 16383 px).");
    }
    const { width, height } = bitmap;
    const original = await renderVariant(bitmap, "original");
    await yieldToMain();
    const web = await renderVariant(bitmap, "web");
    await yieldToMain();
    const thumb = await renderVariant(bitmap, "thumb");
    return { blobs: { original, web, thumb }, width, height, takenAt };
  } finally {
    bitmap.close();
  }
}

/** Miniatura leve para a lista, antes de qualquer envio. Devolve uma objectURL. */
export async function makePreviewUrl(file: File, side = 160): Promise<string | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  try {
    const { w, h } = fitSize(bitmap.width, bitmap.height, side);
    const canvas = makeCanvas(w, h);
    try {
      context(canvas).drawImage(bitmap, 0, 0, w, h);
      const blob = await toBlob(canvas, "image/jpeg", 0.7);
      return blob ? URL.createObjectURL(blob) : null;
    } finally {
      release(canvas);
    }
  } finally {
    bitmap.close();
  }
}

/**
 * Dá para gerar WebP aqui? Primeiro o canvas nativo (1×1); se ele devolver
 * outro formato (WebKit), tenta o encoder WASM.
 */
export async function canEncodeWebp(): Promise<boolean> {
  try {
    const canvas = makeCanvas(1, 1);
    context(canvas).fillRect(0, 0, 1, 1);
    const blob = await toBlob(canvas, UPLOAD_CONTENT_TYPE, 0.8);
    release(canvas);
    nativeWebp = blob?.type === UPLOAD_CONTENT_TYPE;
  } catch {
    nativeWebp = false;
  }
  if (nativeWebp) return true;

  try {
    const wasm = await encodeWebpWasm(new ImageData(1, 1), 0.8);
    return isWebp(new Uint8Array(await wasm.arrayBuffer()));
  } catch {
    return false;
  }
}
