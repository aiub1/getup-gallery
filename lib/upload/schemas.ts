import { z } from "zod";
import { MAX_PHOTOS_PER_PREPARE, MAX_VARIANT_BYTES } from "./limits";

// Server Actions são endpoints públicos: tudo que chega é validado aqui.
// `guid()` e não `uuid()`: o Zod 4 valida a versão no uuid() e recusaria ids que o Postgres aceita.

const bytes = (max: number) => z.number().int().positive().max(max);
const sizes = {
  originalBytes: bytes(MAX_VARIANT_BYTES.original),
  webBytes: bytes(MAX_VARIANT_BYTES.web),
  thumbBytes: bytes(MAX_VARIANT_BYTES.thumb),
};

export const prepareUploadSchema = z.object({
  eventId: z.guid(),
  sessionId: z.guid().nullable(),
  photos: z
    .array(z.object({ clientId: z.string().min(1).max(64), ...sizes }))
    .min(1)
    .max(MAX_PHOTOS_PER_PREPARE),
});

export const confirmUploadSchema = z.object({
  photoId: z.guid(),
  eventId: z.guid(),
  sessionId: z.guid().nullable(),
  // z.boolean() recusa null/undefined: "não respondido" nunca é publicado
  // (CONTRATO §8, invariante 2). Não existe valor padrão.
  containsMinors: z.boolean(),
  isPrivate: z.boolean(),
  // Crianças do cadastro marcadas na foto. Só admin (quem lê `minors`) e só
  // com containsMinors=true; o serviço confere.
  minorIds: z.array(z.guid()).max(20).default([]),
  width: z.number().int().min(1).max(16383),
  height: z.number().int().min(1).max(16383),
  takenAt: z.iso.datetime().nullable(),
  ...sizes,
});

export const createEventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  eventDate: z.iso.date(),
});

export const createSessionSchema = z.object({
  eventId: z.guid(),
  name: z.string().trim().min(1).max(120),
});

export type PrepareUploadInput = z.infer<typeof prepareUploadSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
