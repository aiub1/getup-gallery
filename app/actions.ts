"use server";

import { z } from "zod";
import * as admin from "@/lib/admin/photos";
import { getAdminContext, getViewer } from "@/lib/auth/session";
import { loadTiles } from "@/lib/gallery/load";
import type { PhotoTile } from "@/lib/gallery/types";
import type { ConfirmResult, PrepareResult } from "@/lib/upload/types";

// Server Actions são endpoints POST públicos: nada aqui confia na página que
// as chamou. A leitura refaz a consulta com a sessão de quem chamou; as de
// escrita exigem admin ativo e, mesmo assim, quem autoriza é a RLS do core.

const NOT_ADMIN = { ok: false as const, error: "Entre com uma conta de administrador." };

const loadMoreSchema = z.object({
  sessionId: z.guid().nullable(),
  offset: z.number().int().min(0).max(100_000),
});

export type LoadMoreResult = { ok: true; tiles: PhotoTile[]; hasMore: boolean } | { ok: false };

export async function loadMorePhotos(input: unknown): Promise<LoadMoreResult> {
  const parsed = loadMoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const page = await loadTiles(await getViewer(), parsed.data);
  return { ok: true, tiles: page.tiles, hasMore: page.hasMore };
}

export async function prepareUpload(input: unknown): Promise<PrepareResult> {
  const ctx = await getAdminContext();
  return ctx ? admin.prepareUpload(ctx, input) : NOT_ADMIN;
}

export async function confirmUpload(input: unknown): Promise<ConfirmResult> {
  const ctx = await getAdminContext();
  return ctx ? admin.confirmUpload(ctx, input) : NOT_ADMIN;
}

export async function deletePhoto(input: unknown): Promise<admin.DeleteResult> {
  const ctx = await getAdminContext();
  return ctx ? admin.deletePhoto(ctx, input) : NOT_ADMIN;
}
