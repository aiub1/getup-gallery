// Encoder WebP em WASM (libwebp, via @jsquash/webp) para navegadores cujo canvas
// não gera WebP: o WebKit (Safari e TODOS os navegadores do iPhone) devolve PNG.
//
// Carregado sob demanda (import dinâmico): quem tem WebP nativo nunca baixa o
// WASM. Compilar WASM exige `'wasm-unsafe-eval'` em `script-src`, liberado só
// na CSP (lib/csp.ts).
//
// A entrada é ImageData (pixels crus), então nenhum metadado do arquivo
// original chega ao resultado, como no caminho nativo.

export async function encodeWebpWasm(image: ImageData, quality: number): Promise<Blob> {
  const { encode } = await import("@jsquash/webp");
  // `quality` do canvas é 0–1; o libwebp usa 0–100.
  const buffer = await encode(image, { quality: Math.round(quality * 100) });
  return new Blob([buffer], { type: "image/webp" });
}
