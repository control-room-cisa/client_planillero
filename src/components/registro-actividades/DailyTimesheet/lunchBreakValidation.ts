import { splitActivityIntervals, timeToMinutes } from "./utils";

/** Ventana donde debe existir al menos 1 h libre (solo extras). */
export const LUNCH_GAP_WINDOW_START_MIN = 11 * 60;
export const LUNCH_GAP_WINDOW_END_MIN = 15 * 60;
export const LUNCH_GAP_MIN_FREE_MINUTES = 60;

/** Tramo 12:00–13:00 usado para decidir si el horario laboral ya contempla almuerzo. */
const MIDDAY_LUNCH_START_MIN = 12 * 60;
const MIDDAY_LUNCH_END_MIN = 13 * 60;

export const LUNCH_BREAK_VALIDATION_MESSAGE =
  "Debe dejar al menos 1 hora libre entre 11:00 y 15:00 para almuerzo, o marcar Hora Corrida en la configuración del día.";

export const LUNCH_BREAK_UNCHECK_HORA_CORRIDA_MESSAGE =
  "Para desmarcar Hora Corrida debe dejar al menos 1 hora libre entre 11:00 y 15:00 en sus actividades extra.";

/** Turno nocturno (cruza medianoche): no aplica regla de almuerzo al mediodía. */
export function isNightShiftLabor(
  horaEntrada: string,
  horaSalida: string
): boolean {
  if (!horaEntrada || !horaSalida) return false;
  if (horaEntrada === horaSalida) return false;
  const start = timeToMinutes(horaEntrada);
  const end = timeToMinutes(horaSalida);
  return end <= start;
}

/**
 * Horario diurno que cubre 12:00–13:00 (entrada ≤ 12:00 y salida ≥ 13:00).
 * En ese caso la regla de hueco en 11:00–15:00 no aplica.
 */
export function diurnalLaborCoversMiddayLunch(
  horaEntrada: string,
  horaSalida: string
): boolean {
  if (!horaEntrada || !horaSalida) return false;
  if (horaEntrada === horaSalida) return false;
  if (isNightShiftLabor(horaEntrada, horaSalida)) return false;
  const start = timeToMinutes(horaEntrada);
  const end = timeToMinutes(horaSalida);
  return (
    start <= MIDDAY_LUNCH_START_MIN && end >= MIDDAY_LUNCH_END_MIN
  );
}

export function shouldValidateExtraLunchBreak(params: {
  esHoraCorrida: boolean;
  horaEntrada: string;
  horaSalida: string;
  isH2?: boolean;
}): boolean {
  if (params.isH2) return false;
  if (params.esHoraCorrida) return false;
  if (isNightShiftLabor(params.horaEntrada, params.horaSalida)) return false;
  if (diurnalLaborCoversMiddayLunch(params.horaEntrada, params.horaSalida)) {
    return false;
  }
  return true;
}

function mergeIntervals(
  intervals: Array<[number, number]>
): Array<[number, number]> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = merged[merged.length - 1];
    if (s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

function clipToWindow(
  start: number,
  end: number,
  windowStart: number,
  windowEnd: number
): [number, number] | null {
  const s = Math.max(start, windowStart);
  const e = Math.min(end, windowEnd);
  if (e <= s) return null;
  return [s, e];
}

/**
 * ¿Hay al menos `minFreeMinutes` libres dentro de [windowStart, windowEnd]
 * sin cobertura de actividades extra?
 */
export function hasMinimumFreeLunchWindow(
  extraIntervals: Array<[number, number]>,
  windowStart = LUNCH_GAP_WINDOW_START_MIN,
  windowEnd = LUNCH_GAP_WINDOW_END_MIN,
  minFreeMinutes = LUNCH_GAP_MIN_FREE_MINUTES
): boolean {
  const clipped: Array<[number, number]> = [];

  for (const [start, end] of extraIntervals) {
    const endMin = end === 1440 ? 1440 : end;
    const segments = splitActivityIntervals(start, endMin);
    for (const [segStart, segEnd] of segments) {
      const piece = clipToWindow(segStart, segEnd, windowStart, windowEnd);
      if (piece) clipped.push(piece);
    }
  }

  const merged = mergeIntervals(clipped);
  if (merged.length === 0) return true;

  if (merged[0][0] - windowStart >= minFreeMinutes) return true;

  for (let i = 0; i < merged.length - 1; i++) {
    if (merged[i + 1][0] - merged[i][1] >= minFreeMinutes) return true;
  }

  if (windowEnd - merged[merged.length - 1][1] >= minFreeMinutes) return true;

  return false;
}

function appendIntervalFromHHMM(
  target: Array<[number, number]>,
  horaInicio: string,
  horaFin: string
): void {
  const start = timeToMinutes(horaInicio);
  const end = horaFin === "24:00" ? 1440 : timeToMinutes(horaFin);
  const segments = splitActivityIntervals(start, end);
  for (const seg of segments) {
    target.push(seg);
  }
}

export type ExtraActivityTimeSource = {
  esExtra?: boolean;
  horaInicio?: string | null;
  horaFin?: string | null;
  id?: number;
};

export function collectExtraActivityIntervals(
  activities: ReadonlyArray<ExtraActivityTimeSource>,
  options: {
    formatTime: (isoOrTime: string) => string;
    excludeActivityId?: number;
    excludeActivityRef?: unknown;
    pending?: { horaInicio: string; horaFin: string } | null;
  }
): Array<[number, number]> {
  const intervals: Array<[number, number]> = [];

  for (const act of activities) {
    if (!act.esExtra || !act.horaInicio || !act.horaFin) continue;
    if (
      options.excludeActivityId != null &&
      act.id != null &&
      act.id === options.excludeActivityId
    ) {
      continue;
    }
    if (options.excludeActivityRef != null && act === options.excludeActivityRef) {
      continue;
    }
    appendIntervalFromHHMM(
      intervals,
      options.formatTime(act.horaInicio),
      options.formatTime(act.horaFin)
    );
  }

  if (options.pending?.horaInicio && options.pending?.horaFin) {
    appendIntervalFromHHMM(
      intervals,
      options.pending.horaInicio,
      options.pending.horaFin
    );
  }

  return intervals;
}

export function validateExtraLunchBreakForDay(params: {
  esHoraCorrida: boolean;
  horaEntrada: string;
  horaSalida: string;
  isH2?: boolean;
  extraIntervals: Array<[number, number]>;
}): string | null {
  if (!shouldValidateExtraLunchBreak(params)) return null;
  if (hasMinimumFreeLunchWindow(params.extraIntervals)) return null;
  return LUNCH_BREAK_VALIDATION_MESSAGE;
}

/** Valida extras ya guardadas (sin actividad pendiente en el formulario). */
export function validateExistingExtrasLunchBreak(params: {
  esHoraCorrida: boolean;
  horaEntrada: string;
  horaSalida: string;
  isH2?: boolean;
  activities: ReadonlyArray<ExtraActivityTimeSource>;
  formatTime: (isoOrTime: string) => string;
}): string | null {
  const extraIntervals = collectExtraActivityIntervals(params.activities, {
    formatTime: params.formatTime,
  });
  return validateExtraLunchBreakForDay({
    esHoraCorrida: params.esHoraCorrida,
    horaEntrada: params.horaEntrada,
    horaSalida: params.horaSalida,
    isH2: params.isH2,
    extraIntervals,
  });
}
