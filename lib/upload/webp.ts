// Inspeção de WebP sem decodificar. Usada no navegador como trava antes do
// envio: o arquivo gerado pelo canvas não pode carregar EXIF (GPS, modelo da
// câmera, data) nem XMP.

const fourcc = (b: Uint8Array, at: number) => String.fromCharCode(...Array.from(b.subarray(at, at + 4)));

export function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && fourcc(bytes, 0) === "RIFF" && fourcc(bytes, 8) === "WEBP";
}

/** Chunks RIFF do arquivo, na ordem. Para em chunk truncado. */
export function webpChunks(bytes: Uint8Array): string[] {
  if (!isWebp(bytes)) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: string[] = [];
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    chunks.push(fourcc(bytes, pos));
    const size = view.getUint32(pos + 4, true);
    pos += 8 + size + (size % 2);
  }
  return chunks;
}

/** true se há bloco EXIF ou XMP (metadados de quem tirou a foto). */
export function webpHasMetadata(bytes: Uint8Array): boolean {
  return webpChunks(bytes).some((c) => c === "EXIF" || c === "XMP ");
}
