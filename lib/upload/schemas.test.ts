import { describe, expect, it } from "vitest";
import { confirmUploadSchema, prepareUploadSchema } from "./schemas";

const id = "11111111-1111-4111-8111-111111111111";
const confirm = {
  photoId: id,
  eventId: id,
  sessionId: null,
  containsMinors: false,
  isPrivate: false,
  width: 4000,
  height: 3000,
  takenAt: null,
  originalBytes: 1000,
  webBytes: 500,
  thumbBytes: 100,
};

describe("confirmUploadSchema", () => {
  it("aceita a resposta explícita, Sim ou Não", () => {
    expect(confirmUploadSchema.safeParse(confirm).success).toBe(true);
    expect(confirmUploadSchema.safeParse({ ...confirm, containsMinors: true }).success).toBe(true);
  });

  it("rejeita contains_minors nulo, ausente ou não booleano (CONTRATO §8, inv. 2)", () => {
    expect(confirmUploadSchema.safeParse({ ...confirm, containsMinors: null }).success).toBe(false);
    const missing: Partial<typeof confirm> = { ...confirm };
    delete missing.containsMinors;
    expect(confirmUploadSchema.safeParse(missing).success).toBe(false);
    expect(confirmUploadSchema.safeParse({ ...confirm, containsMinors: "false" }).success).toBe(false);
    expect(confirmUploadSchema.safeParse({ ...confirm, containsMinors: 0 }).success).toBe(false);
  });

  it("recusa tamanhos acima do limite de cada variante", () => {
    expect(confirmUploadSchema.safeParse({ ...confirm, originalBytes: 15 * 1024 * 1024 + 1 }).success).toBe(false);
    expect(confirmUploadSchema.safeParse({ ...confirm, webBytes: 3 * 1024 * 1024 + 1 }).success).toBe(false);
    expect(confirmUploadSchema.safeParse({ ...confirm, thumbBytes: 300 * 1024 + 1 }).success).toBe(false);
    expect(confirmUploadSchema.safeParse({ ...confirm, thumbBytes: 300 * 1024 }).success).toBe(true);
  });
});

describe("prepareUploadSchema", () => {
  const photo = { clientId: "a", originalBytes: 1000, webBytes: 500, thumbBytes: 100 };

  it("aceita até 20 fotos e recusa 21 ou nenhuma", () => {
    const make = (n: number) => ({ eventId: id, sessionId: null, photos: Array.from({ length: n }, () => photo) });
    expect(prepareUploadSchema.safeParse(make(20)).success).toBe(true);
    expect(prepareUploadSchema.safeParse(make(21)).success).toBe(false);
    expect(prepareUploadSchema.safeParse(make(0)).success).toBe(false);
  });

  it("não tem campo de chave: uma chave vinda do cliente é ignorada", () => {
    const parsed = prepareUploadSchema.parse({
      eventId: id,
      sessionId: null,
      photos: [{ ...photo, key: "events/outro/photos/x/original.webp", photoId: id }],
    });
    expect(parsed.photos[0]).not.toHaveProperty("key");
    expect(parsed.photos[0]).not.toHaveProperty("photoId");
  });
});
