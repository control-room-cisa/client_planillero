// src/components/registro-actividades/utils-time.ts
// Utilidades puras de tiempo/cálculo/validación para el registro de actividades.
// No dependen de React ni de servicios.

import type { Activity } from "./types";

/** Convierte "HH:mm" a minutos desde 00:00 */
export function timeToMinutes(time: string): number {
  if (!time) return NaN;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Dado entrada/salida (HH:mm), devuelve límites del día en minutos y si cruza medianoche */
export function getBoundsFromHHMM(entrada: string, salida: string) {
  const start = timeToMinutes(entrada);
  let end = timeToMinutes(salida);
  const crossesMidnight = end <= start;
  if (crossesMidnight) end += 1440; // 1440 minutos = 24 horas
  return { dayStart: start, dayEnd: end, crossesMidnight };
}

/** Normaliza un minuto t al span del día considerando cruce de medianoche */
export function normalizeToDaySpan(
  t: number,
  dayStart: number,
  crossesMidnight: boolean
) {
  return crossesMidnight && t < dayStart ? t + 1440 : t;
}

/** Solape de intervalos [a1,a2) y [b1,b2) en minutos */
export function intervalOverlap(
  a1: number,
  a2: number,
  b1: number,
  b2: number
): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

/** Solape del almuerzo fijo 12:00–13:00 contra [dayStart, dayEnd) en minutos */
export function lunchOverlapInRange(dayStart: number, dayEnd: number): number {
  const L1 = 720; // 12:00
  const L2 = 780; // 13:00
  return Math.max(0, Math.min(dayEnd, L2) - Math.max(dayStart, L1));
}

/** Construye un ISO a partir de fecha base + "HH:mm" (opcionalmente sumando días) */
export function buildISO(baseDate: Date, hhmm: string, addDays = 0): string {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + addDays);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      0,
      0
    )
  ).toISOString();
}

/** Texto de error si una hora HH:mm está fuera del rango laboral entrada/salida */
export function errorOutsideRange(
  which: "inicio" | "fin",
  hhmm: string,
  entrada: string,
  salida: string
): string {
  if (!hhmm || !entrada || !salida) return "";
  const { dayStart, dayEnd, crossesMidnight } = getBoundsFromHHMM(
    entrada,
    salida
  );
  if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd)) return "";

  const t = normalizeToDaySpan(timeToMinutes(hhmm), dayStart, crossesMidnight);
  if (t < dayStart || t > dayEnd) {
    return which === "inicio"
      ? "La hora de inicio está fuera del horario laboral"
      : "La hora de fin está fuera del horario laboral";
  }
  return "";
}

/** Valida hora fin respecto a rango y a inicio cuando NO cruza medianoche */
export function computeHoraFinError(
  fin: string,
  inicio: string,
  entrada: string,
  salida: string
): string {
  const rangoErr = errorOutsideRange("fin", fin, entrada, salida);
  if (rangoErr) return rangoErr;
  if (!fin || !inicio) return "";

  const { crossesMidnight } = getBoundsFromHHMM(entrada, salida);
  const s = timeToMinutes(inicio);
  const e = timeToMinutes(fin);
  if (!crossesMidnight && e <= s) {
    return "La hora final debe ser posterior a la inicial";
  }
  return "";
}

/**
 * Calcula horas invertidas entre inicio/fin (HH:mm) con lógica de almuerzo.
 * - Si esHoraCorrida=false, descuenta solape 12:00–13:00.
 * - Usa entrada/salida (HH:mm) para normalizar cruce de medianoche.
 * Devuelve string con 2 decimales.
 */
export function computeHorasInvertidas(
  inicioHHMM: string,
  finHHMM: string,
  esHoraCorrida: boolean,
  entrada: string,
  salida: string
): string {
  if (!inicioHHMM || !finHHMM) return "";

  // Duración base en horas (ajustando cruce)
  const [h1, m1] = inicioHHMM.split(":").map(Number);
  const [h2, m2] = finHHMM.split(":").map(Number);
  let dur = h2 + m2 / 60 - (h1 + m1 / 60);
  if (dur < 0) dur += 24;

  if (!esHoraCorrida) {
    const { dayStart, crossesMidnight } = getBoundsFromHHMM(entrada, salida);
    let s = normalizeToDaySpan(
      timeToMinutes(inicioHHMM),
      dayStart,
      crossesMidnight
    );
    let e = normalizeToDaySpan(
      timeToMinutes(finHHMM),
      dayStart,
      crossesMidnight
    );
    if (e <= s) e += 1440;

    const L1 = 720; // 12:00
    const L2 = 780; // 13:00
    const overlapMin = Math.max(0, Math.min(e, L2) - Math.max(s, L1));
    dur = Math.max(0, dur - overlapMin / 60);
  }

  return dur.toFixed(2);
}

/** Formatea horas decimales quitando ceros sobrantes (p.ej. 2.50 -> "2.5", 3.00 -> "3") */
export function formatHours(h: number): string {
  return String(Math.round(h * 100) / 100).replace(/\.0+$/, "");
}

/**
 * Calcula horas de una Activity para mostrar (chips/progreso) con misma lógica que computeHorasInvertidas.
 * Usa la hora ISO de la actividad para extraer HH:mm.
 */
export function computeHorasActividadForDisplayNum(
  act: Activity,
  esHoraCorrida: boolean,
  entrada: string,
  salida: string
): number {
  if (!act.horaInicio || !act.horaFin) return 0;

  const { dayStart, crossesMidnight } = getBoundsFromHHMM(entrada, salida);
  const sHM = act.horaInicio.substring(11, 16); // HH:mm
  const eHM = act.horaFin.substring(11, 16); // HH:mm

  let s = normalizeToDaySpan(timeToMinutes(sHM), dayStart, crossesMidnight);
  let e = normalizeToDaySpan(timeToMinutes(eHM), dayStart, crossesMidnight);
  if (e <= s) e += 1440;

  let hours = (e - s) / 60;

  if (!esHoraCorrida) {
    const L1 = 720; // 12:00
    const L2 = 780; // 13:00
    const overlapMin = Math.max(0, Math.min(e, L2) - Math.max(s, L1));
    hours = Math.max(0, hours - overlapMin / 60);
  }

  return Math.round(hours * 100) / 100;
}

export function computeHorasActividadForDisplay(
  act: Activity,
  esHoraCorrida: boolean,
  entrada: string,
  salida: string
): string {
  return formatHours(
    computeHorasActividadForDisplayNum(act, esHoraCorrida, entrada, salida)
  );
}

/** Verifica si una actividad queda fuera del rango de [entrada, salida) */
export function isActivityOutsideRange(
  act: Activity,
  entrada: string,
  salida: string
): boolean {
  if (!act.horaInicio || !act.horaFin) return false;

  const { dayStart, dayEnd, crossesMidnight } = getBoundsFromHHMM(
    entrada,
    salida
  );
  const sHM = act.horaInicio.substring(11, 16);
  const eHM = act.horaFin.substring(11, 16);

  let s = normalizeToDaySpan(timeToMinutes(sHM), dayStart, crossesMidnight);
  let e = normalizeToDaySpan(timeToMinutes(eHM), dayStart, crossesMidnight);
  if (e <= s) e += 1440;

  return s < dayStart || e > dayEnd;
}
