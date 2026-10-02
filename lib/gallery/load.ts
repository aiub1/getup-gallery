import "server-only";
import type { Viewer } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env.server";
import { signPhotoUrls, type SignablePhoto } from "@/lib/r2/sign";
import { createClient } from "@/lib/supabase/server";
import type { GalleryData, PhotoTile, TilesPage } from "./types";

/*
 * Leituras da galeria. Dois caminhos, e nos dois quem decide o que aparece é
 * o banco (CONTRATO §1) — aqui não há filtro de visibilidade:
 *
 * - visitante: funções public_* do core (migration 0007). Devolvem só fotos
 *   de evento público, sem menores, não privadas e publicadas.
 * - admin: tabelas, com o JWT do admin. A RLS devolve tudo do evento,
 *   inclusive o que o visitante não vê; a tela marca essas fotos.
 *
 * Os únicos filtros daqui são de NAVEGAÇÃO: o evento do site, a sessão da aba
 * e a paginação.
 */

export const PHOTOS_PAGE_SIZE = 48;

export async function loadGallery(viewer: Viewer): Promise<GalleryData | null> {
  return viewer.isAdmin ? loadGalleryAsAdmin() : loadGalleryAsVisitor();
}

async function loadGalleryAsVisitor(): Promise<GalleryData | null> {
  const supabase = await createClient();
  const slug = serverEnv.EVENT_SLUG;

  const [eventResult, sessionsResult] = await Promise.all([
    supabase.rpc("public_event", { p_slug: slug }),
    supabase.rpc("public_event_sessions", { p_slug: slug }),
  ]);
  if (eventResult.error) throw new Error(`Falha ao ler o evento: ${eventResult.error.message}`);
  if (sessionsResult.error) throw new Error(`Falha ao ler as sessões: ${sessionsResult.error.message}`);

  const event = eventResult.data?.[0];
  if (!event) return null;

  return {
    event: {
      id: event.id,
      name: event.name,
      description: event.description,
      eventDate: event.event_date,
      photoCount: Number(event.photo_count),
      isPublic: true,
    },
    sessions: (sessionsResult.data ?? []).map((s) => ({ id: s.id, name: s.name, photoCount: Number(s.photo_count) })),
  };
}

async function loadGalleryAsAdmin(): Promise<GalleryData | null> {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, description, event_date, is_public, photos(count)")
    .eq("slug", serverEnv.EVENT_SLUG)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler o evento: ${error.message}`);
  if (!event) return null;

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, name, position, photos(count)")
    .eq("event_id", event.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (sessionsError) throw new Error(`Falha ao ler as sessões: ${sessionsError.message}`);

  return {
    event: {
      id: event.id,
      name: event.name,
      description: event.description,
      eventDate: event.event_date,
      photoCount: event.photos[0]?.count ?? 0,
      isPublic: event.is_public,
    },
    sessions: (sessions ?? []).map((s) => ({ id: s.id, name: s.name, photoCount: s.photos[0]?.count ?? 0 })),
  };
}

type Row = SignablePhoto & {
  width: number | null;
  height: number | null;
  hidden: PhotoTile["hidden"];
};

async function toTiles(rows: Row[]): Promise<PhotoTile[]> {
  // Assina só o que o banco acabou de devolver (regra de lib/r2/sign.ts).
  const [thumbs, webs] = await Promise.all([signPhotoUrls(rows, "thumb"), signPhotoUrls(rows, "web")]);
  return rows.flatMap((row) => {
    const thumbUrl = thumbs.get(row.id);
    const webUrl = webs.get(row.id);
    if (!thumbUrl || !webUrl) return [];
    return [{ id: row.id, thumbUrl, webUrl, width: row.width, height: row.height, hidden: row.hidden }];
  });
}

export async function loadTiles(
  viewer: Viewer,
  args: { sessionId: string | null; offset: number },
): Promise<TilesPage> {
  const supabase = await createClient();

  if (!viewer.isAdmin) {
    // Pede uma a mais para saber se há próxima página.
    const { data, error } = await supabase.rpc("public_event_photos", {
      p_slug: serverEnv.EVENT_SLUG,
      p_session_id: args.sessionId,
      p_limit: PHOTOS_PAGE_SIZE + 1,
      p_offset: args.offset,
    });
    if (error) throw new Error(`Falha ao listar fotos: ${error.message}`);
    const rows = data ?? [];
    const page = rows.slice(0, PHOTOS_PAGE_SIZE).map((row) => ({ ...row, hidden: null }));
    return { tiles: await toTiles(page), hasMore: rows.length > PHOTOS_PAGE_SIZE };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", serverEnv.EVENT_SLUG)
    .maybeSingle();
  if (eventError) throw new Error(`Falha ao ler o evento: ${eventError.message}`);
  if (!event) return { tiles: [], hasMore: false };

  let query = supabase
    .from("photos")
    .select("id, thumb_key, web_key, width, height, contains_minors, is_private")
    .eq("event_id", event.id);
  if (args.sessionId) query = query.eq("session_id", args.sessionId);

  // Mesma ordem da função public_event_photos do core.
  const { data, error } = await query
    .order("taken_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(args.offset, args.offset + PHOTOS_PAGE_SIZE);
  if (error) throw new Error(`Falha ao listar fotos: ${error.message}`);

  const rows = data ?? [];
  const page = rows.slice(0, PHOTOS_PAGE_SIZE).map((row): Row => ({
    id: row.id,
    thumb_key: row.thumb_key,
    web_key: row.web_key,
    width: row.width,
    height: row.height,
    // Só informação para o admin: por que o visitante não vê esta foto.
    hidden: row.contains_minors !== false ? "menores" : row.is_private ? "privada" : null,
  }));
  return { tiles: await toTiles(page), hasMore: rows.length > PHOTOS_PAGE_SIZE };
}
