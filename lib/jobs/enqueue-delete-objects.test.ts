import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { deletableKeys } from "./enqueue-delete-objects";

const EVENT = "11111111-1111-4111-8111-111111111111";
const PHOTO = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const key = (photo: string, variant: string) => `events/${EVENT}/photos/${photo}/${variant}.webp`;

describe("deletableKeys", () => {
  it("aceita as três variantes da própria foto, sem repetir", () => {
    const keys = [key(PHOTO, "original"), key(PHOTO, "web"), key(PHOTO, "thumb"), key(PHOTO, "web")];
    expect(deletableKeys(PHOTO, keys)).toEqual([key(PHOTO, "original"), key(PHOTO, "web"), key(PHOTO, "thumb")]);
  });
  it("recusa chave de outra foto", () => {
    expect(deletableKeys(PHOTO, [key(OTHER, "web")])).toEqual([]);
  });
  it("recusa capa de evento e caminhos fora do formato", () => {
    expect(deletableKeys(PHOTO, [`events/${EVENT}/cover.webp`, `../${key(PHOTO, "web")}`, "", "events/"])).toEqual([]);
  });
});
