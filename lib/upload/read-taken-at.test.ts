import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// process-image.ts só toca em APIs de navegador dentro das funções que as usam;
// importar o módulo em Node é seguro.
const { readTakenAt } = await import("./process-image");

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

describe("readTakenAt (JPEG real, exifr)", () => {
  it("sem OffsetTimeOriginal: America/Sao_Paulo", async () => {
    // O arquivo também tem GPS e orientação; só a data é lida.
    expect(await readTakenAt(fixture("exif-no-offset-gps.jpg"))).toBe("2026-08-23T13:30:00.000Z");
  });

  it("com OffsetTimeOriginal: usa o offset do arquivo", async () => {
    expect(await readTakenAt(fixture("exif-offset.jpg"))).toBe("2026-08-23T09:00:00.000Z");
  });

  it("sem EXIF: null", async () => {
    expect(await readTakenAt(fixture("no-exif.jpg"))).toBeNull();
  });

  it("lixo que não é imagem: null, sem lançar", async () => {
    expect(await readTakenAt(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
