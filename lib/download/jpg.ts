import type { MouseEvent } from "react";

// Download em JPG, convertido no navegador a partir da versão web (WebP,
// 2048 px). O servidor continua entregando só a URL assinada de 60 s de uma
// linha que public_photo devolveu (app/api/download/[id]/route.ts); a
// conversão acontece aqui, sem novo caminho de assinatura nem dependência.

const JPEG_QUALITY = 0.92;

async function fetchAsJpeg(photoId: string): Promise<Blob> {
  const response = await fetch(`/api/download/${photoId}`);
  if (!response.ok) throw new Error(`download ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas indisponível");
    // JPG não tem transparência: fundo branco em vez de preto.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("falha ao gerar o JPG");
    return blob;
  } finally {
    bitmap.close();
  }
}

function clickLink(href: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * onClick dos links de download: baixa o JPG. Se a conversão falhar por
 * qualquer motivo, segue para a rota e baixa o WebP, como antes.
 */
export async function downloadAsJpg(event: MouseEvent<HTMLAnchorElement>, photoId: string): Promise<void> {
  event.preventDefault();
  try {
    const blob = await fetchAsJpeg(photoId);
    const url = URL.createObjectURL(blob);
    clickLink(url, `foto-${photoId.slice(0, 8)}.jpg`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (error) {
    console.error("download em JPG falhou; baixando o WebP", error);
    clickLink(`/api/download/${photoId}`, "");
  }
}
