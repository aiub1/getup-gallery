import type { UploadVariant } from "./limits";

// Formato fixo do CONTRATO §7. O worker depende dele no job `delete_objects`;
// mudar exige PR coordenado nos dois repositórios.

export type PhotoKeys = Record<UploadVariant, string>;

export function photoKeys(eventId: string, photoId: string): PhotoKeys {
  const base = `events/${eventId}/photos/${photoId}`;
  return {
    original: `${base}/original.webp`,
    web: `${base}/web.webp`,
    thumb: `${base}/thumb.webp`,
  };
}
