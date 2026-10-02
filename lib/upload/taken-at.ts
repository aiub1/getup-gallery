// EXIF DateTimeOriginal ("YYYY:MM:DD HH:MM:SS") não traz fuso. Com
// OffsetTimeOriginal ("+02:00") o instante é exato; sem ele, a câmera estava
// na hora local da igreja: America/Sao_Paulo (com o horário de verão que
// valia na data, até 2019).

const LOCAL_ZONE = "America/Sao_Paulo";
const EXIF_DATE = /^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;
const EXIF_OFFSET = /^([+-])(\d{2}):?(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

function zoneOffsetMs(instant: number, timeZone: string): number {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, fmt);
  }
  const parts = fmt.formatToParts(new Date(instant));
  const n = (type: string) => Number(parts.find((x) => x.type === type)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Instante UTC cuja hora de parede em `timeZone` é a informada. */
function wallClockToUtc(wall: number, timeZone: string): number {
  const first = wall - zoneOffsetMs(wall, timeZone);
  return wall - zoneOffsetMs(first, timeZone);
}

/**
 * `taken_at` em ISO UTC, ou null se não há data utilizável.
 * Recebe os valores CRUS do EXIF (strings), nunca um Date já "revivido" pelo
 * leitor, que interpretaria a data no fuso do navegador.
 */
export function parseTakenAt(
  dateTimeOriginal: unknown,
  offsetTimeOriginal?: unknown,
  now: number = Date.now(),
): string | null {
  if (typeof dateTimeOriginal !== "string") return null;
  const m = EXIF_DATE.exec(dateTimeOriginal.trim());
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1).map(Number) as [
    number, number, number, number, number, number,
  ];
  if (year < 1990 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  // Rejeita 31/02 e afins: o Date normalizaria para outro dia.
  if (new Date(wall).getUTCDate() !== day) return null;

  let instant: number;
  const off = typeof offsetTimeOriginal === "string" ? EXIF_OFFSET.exec(offsetTimeOriginal.trim()) : null;
  if (off) {
    const minutes = Number(off[2]) * 60 + Number(off[3]);
    instant = wall - (off[1] === "-" ? -minutes : minutes) * 60_000;
  } else {
    instant = wallClockToUtc(wall, LOCAL_ZONE);
  }

  // Relógio de câmera zerado ou no futuro não é data de captura.
  if (instant > now + 24 * 3600_000) return null;
  return new Date(instant).toISOString();
}
