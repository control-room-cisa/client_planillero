import type { Activity } from "../types";
import { TZ, TZ_OFFSET } from "./constants";

// ===== Funciones de fecha y hora =====

export const ymdInTZ = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// Formatear hora en zona local para mostrar lo que eligió el empleado
export const formatTimeLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

export const buildISO = (baseDate: Date, hhmmStr: string, addDays = 0) => {
  // fecha base en TZ local (ya tienes ymdInTZ con America/Tegucigalpa)
  const ymd = ymdInTZ(baseDate); // "YYYY-MM-DD" en TZ local
  // Permitir 24:00 como fin de día (siguiente día a las 00:00)
  let effectiveHHMM = hhmmStr;
  let effectiveAddDays = addDays;
  if (hhmmStr === "24:00") {
    effectiveHHMM = "00:00";
    effectiveAddDays += 1;
  }
  // construye un ISO con offset local; toISOString() lo convierte a UTC
  const d = new Date(`${ymd}T${effectiveHHMM}:00${TZ_OFFSET}`);
  if (effectiveAddDays > 0) d.setDate(d.getDate() + effectiveAddDays);
  return d.toISOString();
};

// ===== Helpers de tiempo =====

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// Función para validar formato de hora (incluyendo 24:00)
export const isValidTimeFormat = (time: string): boolean => {
  if (!time) return false;
  const timeRegex = /^([01]?\d|2[0-4]):([0-5]\d)$/;
  if (!timeRegex.test(time)) return false;

  const [h, m] = time.split(":").map(Number);
  // Permitir 24:00 pero no 24:01, 24:15, etc.
  if (h === 24 && m !== 0) return false;
  return true;
};

// Función para incrementar/decrementar tiempo con teclas direccionales
export const adjustTime = (
  timeStr: string,
  direction: "up" | "down",
  isHour: boolean
): string => {
  if (!timeStr) return timeStr;

  let [h, m] = timeStr.split(":").map(Number);

  if (isHour) {
    // Ajustar horas
    if (direction === "up") {
      if (timeStr === "24:00") {
        // Desde 24:00 ir a 01:00
        h = 1;
        m = 0;
      } else if (h >= 23) {
        // Desde 23:xx ir a 00:xx (no permitir más de 24:00 con horas)
        h = 0;
      } else {
        h = h + 1;
      }
    } else {
      if (timeStr === "24:00") {
        // Desde 24:00 ir a 23:00
        h = 23;
        m = 0;
      } else if (h <= 0) {
        // Desde 00:xx ir a 23:xx
        h = 23;
      } else {
        h = h - 1;
      }
    }
  } else {
    // Ajustar minutos en intervalos de 15
    if (direction === "up") {
      if (timeStr === "23:45") {
        // Caso especial: desde 23:45 ir a 24:00 (solo para fin de día)
        h = 24;
        m = 0;
      } else if (timeStr === "24:00") {
        // Desde 24:00 ir a 00:15
        h = 0;
        m = 15;
      } else {
        m += 15;
        if (m >= 60) {
          m = 0;
          h = h >= 23 ? 0 : h + 1;
        }
      }
    } else {
      if (timeStr === "24:00") {
        // Desde 24:00 ir a 23:45
        h = 23;
        m = 45;
      } else if (timeStr === "00:00") {
        // Desde 00:00 ir a 23:45
        h = 23;
        m = 45;
      } else {
        m -= 15;
        if (m < 0) {
          m = 45;
          h = h <= 0 ? 23 : h - 1;
        }
      }
    }
  }

  // Formatear resultado
  const result = `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}`;

  return result;
};

// Función para redondear tiempo a intervalos de 15 minutos
export const roundToQuarterHour = (time: string): string => {
  if (!time) return time;

  // Manejar 24:00 especialmente
  if (time === "24:00") return time;

  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m;
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;

  // Si el redondeo lleva a 24:00 (1440 minutos), mantenerlo
  if (roundedMinutes >= 1440) return "24:00";

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

export const intervalOverlap = (
  a1: number,
  a2: number,
  b1: number,
  b2: number
) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

// ===== Helpers de validación/cálculo =====

// Devuelve error si la hora dada está fuera del rango del día (texto fijo pedido)
// Nota: Los inputs de hora solo se muestran para Hora Extra, por lo que
// esta validación no aplica y se omite para evitar mensajes contradictorios.
export const errorOutsideRange = (): string => "";

// Valida Hora fin: primero rango; luego relación con inicio
export const computeHoraFinError = (fin: string, inicio: string): string => {
  const rangoErr = errorOutsideRange();
  if (rangoErr) return rangoErr;
  if (!fin || !inicio) return "";

  const s = timeToMinutes(inicio);
  let e = timeToMinutes(fin);

  // Permitir 24:00 como fin válido (representa siguiente día 00:00)
  if (fin === "24:00") {
    e = 1440; // 24:00 = 1440 minutos
  }

  // Validación estricta: fin debe ser mayor que inicio,
  // EXCEPTO si fin es exactamente 00:00 (que representa 24:00)
  if (e <= s) {
    if (fin === "00:00" && s > 0) {
      // 00:00 como fin es válido solo si inicio > 00:00 (cruza medianoche)
      return "";
    } else {
      return "La hora final debe ser posterior a la inicial";
    }
  }

  return "";
};

// Calcula HH con o sin descuento de almuerzo (12:00–13:00) según reglas del horario
// Para horas extra, NUNCA se descuenta almuerzo
export const computeHorasInvertidas = (
  inicioHHMM: string,
  finHHMM: string,
  isExtraHour: boolean,
  horaAlmuerzo: number
): string => {
  if (!inicioHHMM || !finHHMM) return "";

  // Duración base - manejar 24:00 como fin de día
  const [h1, m1] = inicioHHMM.split(":").map(Number);
  let h2, m2;
  if (finHHMM === "24:00") {
    h2 = 24;
    m2 = 0;
  } else {
    [h2, m2] = finHHMM.split(":").map(Number);
  }

  let dur = h2 + m2 / 60 - (h1 + m1 / 60);
  if (dur < 0) dur += 24; // cruza medianoche

  // Para horas extra, NO descontar almuerzo bajo ninguna circunstancia
  if (isExtraHour) {
    return dur.toFixed(2);
  }

  // Solo descontar almuerzo si horaAlmuerzo > 0 (no es hora corrida) Y si hay solapamiento real
  if (horaAlmuerzo > 0) {
    const inicioMin = timeToMinutes(inicioHHMM);
    let finMin = finHHMM === "24:00" ? 1440 : timeToMinutes(finHHMM);

    // Manejar cruce de medianoche
    if (finMin <= inicioMin) {
      finMin += 1440;
    }

    const L1 = 720; // 12:00
    const L2 = 780; // 13:00

    // Verificar si hay solapamiento real entre la actividad y el período de almuerzo
    const overlapMin = intervalOverlap(inicioMin, finMin, L1, L2);

    // Solo descontar si hay solapamiento real
    if (overlapMin > 0) {
      dur = Math.max(0, dur - overlapMin / 60);
    }
  }

  return dur.toFixed(2);
};

// === Helpers para mostrar/sumar horas por actividad (chips & progreso) ===
export const formatHours = (h: number) =>
  String(Math.round(h * 100) / 100).replace(/\.0+$/, "");

export const computeHorasActividadForDisplayNum = (
  act: Activity,
  horaAlmuerzo: number
): number => {
  // Si no hay horas de inicio/fin (actividad normal), usar duracionHoras
  if (!act.horaInicio || !act.horaFin)
    return Math.max(0, Number(act.duracionHoras || 0));

  const sHM = formatTimeLocal(act.horaInicio);
  const eHM = formatTimeLocal(act.horaFin);

  const inicioMin = timeToMinutes(sHM);
  let finMin = eHM === "24:00" ? 1440 : timeToMinutes(eHM);

  // Manejar cruce de medianoche
  if (finMin <= inicioMin) {
    finMin += 1440;
  }

  // Duración base
  let hours = (finMin - inicioMin) / 60;

  // Para horas extra, NO descontar almuerzo bajo ninguna circunstancia
  if (act.esExtra) {
    return Math.round(hours * 100) / 100;
  }

  // Solo descontar almuerzo si horaAlmuerzo > 0 (no es hora corrida) Y si hay solapamiento real
  if (horaAlmuerzo > 0) {
    const L1 = 720; // 12:00
    const L2 = 780; // 13:00

    // Verificar si hay solapamiento real entre la actividad y el período de almuerzo
    const overlapMin = intervalOverlap(inicioMin, finMin, L1, L2);

    // Solo descontar si hay solapamiento real
    if (overlapMin > 0) {
      hours = Math.max(0, hours - overlapMin / 60);
    }
  }

  return Math.round(hours * 100) / 100;
};

export const computeHorasActividadForDisplay = (
  act: Activity,
  horaAlmuerzo: number
): string => formatHours(computeHorasActividadForDisplayNum(act, horaAlmuerzo));

// === Helpers para validar actividades vs. nuevo rango del día ===
export const buildIntervals = (
  start: number,
  end: number
): Array<[number, number]> => {
  if (end >= start) return [[start, end]];
  return [
    [0, end],
    [start, 24 * 60],
  ];
};

export const getBoundsFromHHMM = (entrada: string, salida: string) => {
  const start = timeToMinutes(entrada);
  let end = timeToMinutes(salida);
  const crossesMidnight = end <= start;
  const intervals = buildIntervals(start, end);
  if (crossesMidnight) end += 1440;
  return { dayStart: start, dayEnd: end, crossesMidnight, intervals };
};

export const splitActivityIntervals = (
  startMin: number,
  endMin: number
): Array<[number, number]> => {
  if (endMin >= startMin) return [[startMin, endMin]];
  return [
    [startMin, 24 * 60],
    [0, endMin],
  ];
};

export const isActivityOutsideRange = (
  act: Activity,
  intervals: Array<[number, number]>
) => {
  if (!act.horaInicio || !act.horaFin) return false;
  const sHM = formatTimeLocal(act.horaInicio);
  const eHM = formatTimeLocal(act.horaFin);

  const activityIntervals = splitActivityIntervals(
    timeToMinutes(sHM),
    eHM === "24:00" ? 24 * 60 : timeToMinutes(eHM)
  );

  const isSegmentInside = (segStart: number, segEnd: number) =>
    intervals.some(
      ([intStart, intEnd]) => segStart >= intStart && segEnd <= intEnd
    );

  return activityIntervals.some(
    ([segStart, segEnd]) => !isSegmentInside(segStart, segEnd)
  );
};

// ===== Formateo de fecha =====
export const formatDate = (date: Date) => {
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
  return `${days[date.getDay()]}, ${date.getDate()} de ${
    months[date.getMonth()]
  } de ${date.getFullYear()}`;
};


