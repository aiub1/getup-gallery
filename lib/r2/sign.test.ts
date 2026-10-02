import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({ serverEnv: { R2_BUCKET: "b" } }));
vi.mock("./client", () => ({ getR2Client: () => ({}) }));

import { downloadFileName, signingWindowStart } from "./sign";

describe("downloadFileName", () => {
  it("monta o nome só com letras, números e hífen", () => {
    expect(downloadFileName(["getup-2026", "Sessão II", "0f3a9c1b"])).toBe("getup-2026-sessao-ii-0f3a9c1b.webp");
  });
  it("ignora partes vazias e não deixa passar aspas ou barras", () => {
    expect(downloadFileName(["a\"b/../c", null, ""])).toBe("a-b-c.webp");
  });
  it("tem nome padrão", () => {
    expect(downloadFileName([null])).toBe("foto.webp");
  });
});

describe("signingWindowStart", () => {
  it("arredonda para o início do bloco de 10 minutos", () => {
    const start = signingWindowStart(Date.UTC(2026, 9, 2, 12, 17, 30));
    expect(start.toISOString()).toBe("2026-10-02T12:10:00.000Z");
  });
});
