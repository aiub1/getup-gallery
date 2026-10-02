import { describe, expect, it } from "vitest";
import { eventYear, formatDateTime, formatEventDateLong, formatEventDateShort, formatTimeOfDay } from "./date";

describe("datas de evento (date, sem fuso)", () => {
  it("abrevia como o mockup", () => {
    expect(formatEventDateShort("2026-09-13")).toBe("13 set 2026");
    expect(formatEventDateShort("2026-01-05")).toBe("5 jan 2026");
  });

  it("escreve por extenso", () => {
    expect(formatEventDateLong("2026-09-13")).toBe("13 de setembro de 2026");
    expect(formatEventDateLong("2026-03-01")).toBe("1 de março de 2026");
  });

  it("não desloca o dia com o fuso do servidor", () => {
    const original = process.env.TZ;
    process.env.TZ = "Pacific/Auckland";
    try {
      expect(formatEventDateShort("2026-12-31")).toBe("31 dez 2026");
    } finally {
      process.env.TZ = original;
    }
  });

  it("devolve o valor original quando não é uma data", () => {
    expect(formatEventDateShort("lixo")).toBe("lixo");
    expect(formatEventDateLong("2026-13-40")).toBe("2026-13-40");
  });

  it("extrai o ano", () => {
    expect(eventYear("2026-09-13")).toBe(2026);
    expect(eventYear("x")).toBeNull();
  });
});

describe("timestamptz no fuso de Curitiba", () => {
  it("converte de UTC (UTC-3)", () => {
    expect(formatTimeOfDay("2026-09-13T13:42:00Z")).toBe("10h42");
    expect(formatDateTime("2026-09-13T13:42:00Z")).toBe("13 set 2026 · 10h42");
  });

  it("completa os minutos e cruza a meia-noite", () => {
    expect(formatTimeOfDay("2026-09-13T13:05:00Z")).toBe("10h05");
    expect(formatDateTime("2026-09-14T01:30:00Z")).toBe("13 set 2026 · 22h30");
    expect(formatTimeOfDay("2026-09-13T03:00:00Z")).toBe("0h00");
  });

  it("recusa timestamp inválido", () => {
    expect(formatTimeOfDay("não é data")).toBeNull();
    expect(formatDateTime("")).toBeNull();
  });
});
