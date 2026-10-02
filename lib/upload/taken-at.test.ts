import { describe, expect, it } from "vitest";
import { parseTakenAt } from "./taken-at";

const NOW = Date.parse("2026-09-30T12:00:00Z");

describe("parseTakenAt", () => {
  it("sem offset, interpreta como America/Sao_Paulo (UTC-3 hoje)", () => {
    expect(parseTakenAt("2026:08:23 10:30:00", undefined, NOW)).toBe("2026-08-23T13:30:00.000Z");
  });

  it("respeita o horário de verão que valia na data (UTC-2 em janeiro de 2018)", () => {
    expect(parseTakenAt("2018:01:15 10:00:00", undefined, NOW)).toBe("2018-01-15T12:00:00.000Z");
  });

  it("com OffsetTimeOriginal usa o offset, não o fuso da igreja", () => {
    expect(parseTakenAt("2026:08:23 10:30:00", "+02:00", NOW)).toBe("2026-08-23T08:30:00.000Z");
    expect(parseTakenAt("2026:08:23 10:30:00", "-05:00", NOW)).toBe("2026-08-23T15:30:00.000Z");
  });

  it("não depende do fuso do processo", () => {
    const original = process.env.TZ;
    process.env.TZ = "Asia/Tokyo";
    try {
      expect(parseTakenAt("2026:08:23 10:30:00", undefined, NOW)).toBe("2026-08-23T13:30:00.000Z");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("sem data utilizável devolve null", () => {
    expect(parseTakenAt(undefined, undefined, NOW)).toBeNull();
    expect(parseTakenAt("", undefined, NOW)).toBeNull();
    expect(parseTakenAt("0000:00:00 00:00:00", undefined, NOW)).toBeNull();
    expect(parseTakenAt("2026:02:31 10:00:00", undefined, NOW)).toBeNull();
    expect(parseTakenAt(new Date(), undefined, NOW)).toBeNull();
  });

  it("data no futuro é relógio de câmera errado", () => {
    expect(parseTakenAt("2030:01:01 10:00:00", undefined, NOW)).toBeNull();
  });
});
