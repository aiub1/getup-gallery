// Datas em pt-BR montadas à mão, sem `toLocaleDateString`: o ICU muda a
// abreviação ("set." vs "set") entre versões e o mockup usa "13 set 2026".
// `events.event_date` é um `date` do Postgres (sem fuso): nunca passa por
// `new Date()`, que a deslocaria conforme o fuso do servidor.

export const APP_TIME_ZONE = "America/Sao_Paulo";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year: Number(match[1]), month, day };
}

/** "2026-09-13" → "13 set 2026" */
export function formatEventDateShort(value: string): string {
  const parts = parseDateOnly(value);
  if (!parts) return value;
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
}

/** "2026-09-13" → "13 de setembro de 2026" */
export function formatEventDateLong(value: string): string {
  const parts = parseDateOnly(value);
  if (!parts) return value;
  return `${parts.day} de ${MONTHS_LONG[parts.month - 1]} de ${parts.year}`;
}

/** "2026-09-13" → 2026 */
export function eventYear(value: string): number | null {
  return parseDateOnly(value)?.year ?? null;
}

const zonedParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function zoned(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const out: Record<string, string> = {};
  for (const part of zonedParts.formatToParts(date)) out[part.type] = part.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
  };
}

/** timestamptz → "10h42", no fuso de Curitiba. */
export function formatTimeOfDay(iso: string): string | null {
  const z = zoned(iso);
  if (!z) return null;
  return `${z.hour}h${String(z.minute).padStart(2, "0")}`;
}

/** timestamptz → "13 set 2026 · 10h42", no fuso de Curitiba. */
export function formatDateTime(iso: string): string | null {
  const z = zoned(iso);
  if (!z) return null;
  return `${z.day} ${MONTHS_SHORT[z.month - 1]} ${z.year} · ${z.hour}h${String(z.minute).padStart(2, "0")}`;
}
