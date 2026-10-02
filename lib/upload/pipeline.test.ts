import { describe, expect, it, vi } from "vitest";
import { createSerialRunner, runPhotoJob, runPool, type PhotoJob, type PipelineDeps } from "./pipeline";

const blob = (n: number) => new Blob([new Uint8Array(n)]);
const processed = {
  blobs: { original: blob(1000), web: blob(500), thumb: blob(100) },
  width: 4000,
  height: 3000,
  takenAt: "2026-08-23T13:30:00.000Z",
};
const file = new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
const job = (over: Partial<PhotoJob> = {}): PhotoJob => ({
  clientId: "c1",
  file,
  eventId: "e1",
  sessionId: null,
  containsMinors: false,
  isPrivate: false,
  ...over,
});

function deps(over: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    process: vi.fn(async () => processed),
    prepare: vi.fn(async () => ({
      ok: true as const,
      photos: [
        {
          clientId: "c1",
          photoId: "p1",
          uploads: {
            original: { url: "u/o", contentType: "image/webp" as const },
            web: { url: "u/w", contentType: "image/webp" as const },
            thumb: { url: "u/t", contentType: "image/webp" as const },
          },
        },
      ],
    })),
    confirm: vi.fn(async () => ({ ok: true as const, status: "pending" as const, indexing: "queued" as const })),
    put: vi.fn(async (_u: string, b: Blob, _c: string, onProgress: (n: number) => void) => onProgress(b.size)),
    ...over,
  };
}

describe("runPhotoJob", () => {
  it("converte, pede URLs só com tamanhos, envia os três e confirma com as respostas", async () => {
    const d = deps();
    const stages: string[] = [];
    const r = await runPhotoJob(job({ containsMinors: true, isPrivate: true }), d, (s) => stages.push(s));
    expect(r).toEqual({ ok: true, indexing: "queued" });
    expect(d.prepare).toHaveBeenCalledWith({
      eventId: "e1",
      sessionId: null,
      photos: [{ clientId: "c1", originalBytes: 1000, webBytes: 500, thumbBytes: 100 }],
    });
    expect(d.put).toHaveBeenCalledTimes(3);
    expect(d.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ photoId: "p1", containsMinors: true, isPrivate: true, width: 4000, originalBytes: 1000 }),
    );
    expect(stages[0]).toBe("processing");
    expect(stages.at(-1)).toBe("confirming");
  });

  it("contains_minors nulo nunca chega ao servidor", async () => {
    const d = deps();
    const r = await runPhotoJob(job({ containsMinors: null }), d, () => {});
    expect(r.ok).toBe(false);
    expect(d.process).not.toHaveBeenCalled();
    expect(d.prepare).not.toHaveBeenCalled();
    expect(d.confirm).not.toHaveBeenCalled();
  });

  it("progresso soma os três arquivos e termina em 1", async () => {
    const seen: number[] = [];
    await runPhotoJob(job(), deps(), (s, p) => s === "uploading" && p !== undefined && seen.push(p));
    expect(seen.at(-1)).toBe(1);
    expect(seen.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it("falha do PUT não confirma nada", async () => {
    const d = deps({ put: vi.fn(async () => Promise.reject(new Error("HTTP 403"))) });
    const r = await runPhotoJob(job(), d, () => {});
    expect(r).toEqual({ ok: false, error: "HTTP 403", resume: undefined, stage: "uploading" });
    expect(d.confirm).not.toHaveBeenCalled();
  });

  it("falha só na confirmação: o retry reaproveita os arquivos (sem converter nem enviar de novo)", async () => {
    const d1 = deps({ confirm: vi.fn(async () => Promise.reject(new Error("rede"))) });
    const first = await runPhotoJob(job(), d1, () => {});
    expect(first.ok).toBe(false);
    if (first.ok) return;
    expect(first.resume?.photoId).toBe("p1");

    const d2 = deps();
    const second = await runPhotoJob(job({ resume: first.resume }), d2, () => {});
    expect(second).toEqual({ ok: true, indexing: "queued" });
    expect(d2.process).not.toHaveBeenCalled();
    expect(d2.prepare).not.toHaveBeenCalled();
    expect(d2.put).not.toHaveBeenCalled();
    expect(d2.confirm).toHaveBeenCalledWith(first.resume);
  });

  it("erro do servidor na confirmação também guarda o resume", async () => {
    const d = deps({ confirm: vi.fn(async () => ({ ok: false as const, error: "não confere" })) });
    const r = await runPhotoJob(job(), d, () => {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resume?.photoId).toBe("p1");
  });

  it("propaga 'indexação pendente' (job não criado)", async () => {
    const d = deps({ confirm: vi.fn(async () => ({ ok: true as const, status: "pending" as const, indexing: "failed" as const })) });
    expect(await runPhotoJob(job(), d, () => {})).toEqual({ ok: true, indexing: "failed" });
  });
});

describe("runPool / createSerialRunner", () => {
  const tick = () => new Promise((r) => setTimeout(r, 5));

  it("no máximo 3 fotos em paralelo", async () => {
    let running = 0;
    let peak = 0;
    await runPool(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await tick();
      running -= 1;
    });
    expect(peak).toBe(3);
  });

  it("um erro não para os outros itens", async () => {
    const done: number[] = [];
    await runPool([1, 2, 3, 4], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      done.push(n);
    });
    expect(done.sort()).toEqual([1, 3, 4]);
  });

  it("o processamento roda uma foto por vez mesmo com 3 pistas", async () => {
    const serial = createSerialRunner();
    let running = 0;
    let peak = 0;
    await runPool(Array.from({ length: 6 }, (_, i) => i), 3, () =>
      serial(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await tick();
        running -= 1;
      }),
    );
    expect(peak).toBe(1);
  });

  it("uma falha no processamento não trava a fila serial", async () => {
    const serial = createSerialRunner();
    const a = serial(async () => Promise.reject(new Error("x")));
    const b = serial(async () => "ok");
    await expect(a).rejects.toThrow("x");
    await expect(b).resolves.toBe("ok");
  });
});
