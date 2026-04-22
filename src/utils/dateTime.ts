const DEFAULT_TZ = "America/Tegucigalpa";
const DEFAULT_TZ_OFFSET = "-06:00";

const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Retorna YYYY-MM-DD para la zona horaria indicada. */
export const ymdInTimeZone = (
  d: Date,
  timeZone = DEFAULT_TZ,
): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

/** `fecha` del backend como "YYYY-MM-DD" (sin parse UTC ambiguo). */
export const registroFechaToYmdSafe = (
  fecha: string | undefined | null,
): string | null => {
  if (!fecha) return null;
  const s = fecha.trim().slice(0, 10);
  return ISO_YMD.test(s) ? s : null;
};

/** Suma días calendario a un YYYY-MM-DD respetando la zona/offset indicados. */
export const addCalendarDaysYmdInTimeZone = (
  ymd: string,
  deltaDays: number,
  timeZone = DEFAULT_TZ,
  tzOffset = DEFAULT_TZ_OFFSET,
): string => {
  const d = new Date(`${ymd}T12:00:00${tzOffset}`);
  d.setDate(d.getDate() + deltaDays);
  return ymdInTimeZone(d, timeZone);
};

/** Formatea ISO a HH:mm en zona horaria indicada. */
export const formatTimeInTimeZone = (
  iso?: string | null,
  timeZone = DEFAULT_TZ,
): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-HN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

/** Formatea YYYY-MM-DD a texto largo en español. */
export const formatDateSpanishFromYmd = (ymd?: string | null): string => {
  if (!ymd) return "Fecha no disponible";
  const s = registroFechaToYmdSafe(ymd);
  if (!s) return "Fecha no disponible";
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  const days = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName} ${day} de ${month} del ${year}`;
};

