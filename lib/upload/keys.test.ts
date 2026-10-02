import { describe, expect, it } from "vitest";
import { photoKeys } from "./keys";

describe("photoKeys", () => {
  it("segue o formato fixo do CONTRATO §7", () => {
    expect(photoKeys("e1", "p1")).toEqual({
      original: "events/e1/photos/p1/original.webp",
      web: "events/e1/photos/p1/web.webp",
      thumb: "events/e1/photos/p1/thumb.webp",
    });
  });
});
