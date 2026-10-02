// Tipos que servidor e navegador compartilham (sem "server-only").

export type GalleryEvent = {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  /** fotos que ESTE visitante enxerga — nunca o total real */
  photoCount: number;
  isPublic: boolean;
};

export type GallerySession = { id: string; name: string; photoCount: number };

export type GalleryData = { event: GalleryEvent; sessions: GallerySession[] };

export type PhotoTile = {
  id: string;
  thumbUrl: string;
  webUrl: string;
  width: number | null;
  height: number | null;
  /** Só chega preenchido para o admin: motivo de a foto não ser pública. */
  hidden: "menores" | "privada" | null;
};

export type TilesPage = { tiles: PhotoTile[]; hasMore: boolean };
