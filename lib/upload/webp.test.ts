import { describe, expect, it } from "vitest";
import { isWebp, webpChunks, webpHasMetadata } from "./webp";

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

function chunk(id: string, data: number[]): number[] {
  return [...ascii(id), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])];
}

function webp(...chunks: number[][]): Uint8Array {
  const body = [...ascii("WEBP"), ...chunks.flat()];
  return Uint8Array.from([...ascii("RIFF"), ...le32(body.length), ...body]);
}

describe("webpHasMetadata", () => {
  it("WebP só com imagem (como o canvas gera) não tem metadados", () => {
    const file = webp(chunk("VP8 ", [1, 2, 3, 4, 5]));
    expect(isWebp(file)).toBe(true);
    expect(webpChunks(file)).toEqual(["VP8 "]);
    expect(webpHasMetadata(file)).toBe(false);
  });

  it("detecta bloco EXIF (GPS, modelo da câmera) mesmo com chunk de tamanho ímpar antes", () => {
    const file = webp(chunk("VP8X", new Array(10).fill(0)), chunk("VP8 ", [1, 2, 3]), chunk("EXIF", ascii("Exif\0\0GPS")));
    expect(webpChunks(file)).toEqual(["VP8X", "VP8 ", "EXIF"]);
    expect(webpHasMetadata(file)).toBe(true);
  });

  it("detecta XMP", () => {
    expect(webpHasMetadata(webp(chunk("VP8 ", [1, 2]), chunk("XMP ", ascii("<x/>"))))).toBe(true);
  });

  it("ICC não conta como metadado de privacidade", () => {
    expect(webpHasMetadata(webp(chunk("ICCP", [1, 2]), chunk("VP8 ", [1, 2])))).toBe(false);
  });

  it("não-WebP (ex.: PNG que o navegador devolve quando não sabe gerar WebP)", () => {
    const png = Uint8Array.from([0x89, ...ascii("PNG"), 13, 10, 26, 10, 0, 0, 0, 0]);
    expect(isWebp(png)).toBe(false);
    expect(webpChunks(png)).toEqual([]);
  });

  it("arquivo truncado não trava", () => {
    const file = webp(chunk("VP8 ", [1, 2, 3, 4]));
    expect(() => webpChunks(file.subarray(0, 18))).not.toThrow();
  });
});
