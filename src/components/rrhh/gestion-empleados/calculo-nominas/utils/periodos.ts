/** Año mínimo del selector de nómina (inclusive). */
export const MIN_AÑO_NOMINA = 2025;

export type CorteQuincena = {
  diaInicio: number;
  /** 0 = último día del mes */
  diaFin: number;
};

export type PeriodosNominaConfig = {
  a: CorteQuincena;
  b: CorteQuincena;
};

/** Defaults alineados con .env del server (legacy 27–11 / 12–26). */
export const DEFAULT_PERIODOS_NOMINA_CONFIG: PeriodosNominaConfig = {
  a: { diaInicio: 27, diaFin: 11 },
  b: { diaInicio: 12, diaFin: 26 },
};

export type IntervaloNominaCalculo = {
  label: string;
  fechaInicio: string;
  fechaFin: string;
  valor: string;
  letra?: "A" | "B";
};

/** YYYY-MM-DD en calendario local (evita corrimientos con toISOString). */
export const toYmdLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function parseYmdLocal(iso: string): Date {
  const s = iso.length >= 10 ? iso.slice(0, 10) : iso;
  return new Date(`${s}T00:00:00`);
}

export function cruzaMes(corte: CorteQuincena): boolean {
  return corte.diaFin !== 0 && corte.diaInicio > corte.diaFin;
}

export function lastDayOfMonth(año: number, mes0: number): number {
  return new Date(año, mes0 + 1, 0).getDate();
}

function resolveDiaFin(año: number, mes0: number, diaFinConfig: number): number {
  if (diaFinConfig === 0) return lastDayOfMonth(año, mes0);
  return diaFinConfig;
}

function finCoincideConCorte(fin: Date, corte: CorteQuincena): boolean {
  if (corte.diaFin === 0) {
    return fin.getDate() === lastDayOfMonth(fin.getFullYear(), fin.getMonth());
  }
  return fin.getDate() === corte.diaFin;
}

function matchesCorte(inicio: Date, fin: Date, corte: CorteQuincena): boolean {
  if (inicio.getDate() !== corte.diaInicio) return false;
  return finCoincideConCorte(fin, corte);
}

/**
 * mesNomina 1–12 = mes del código / fecha fin.
 */
export function construirIntervalo(
  año: number,
  mesNomina: number,
  letra: "A" | "B",
  config: PeriodosNominaConfig,
): { fechaInicio: string; fechaFin: string; letra: "A" | "B" } {
  const corte = letra === "A" ? config.a : config.b;
  const mes0 = mesNomina - 1;
  const diaFin = resolveDiaFin(año, mes0, corte.diaFin);
  const fin = new Date(año, mes0, diaFin);
  const inicio = cruzaMes(corte)
    ? new Date(año, mes0 - 1, corte.diaInicio)
    : new Date(año, mes0, corte.diaInicio);
  return {
    fechaInicio: toYmdLocal(inicio),
    fechaFin: toYmdLocal(fin),
    letra,
  };
}

export function clasificarPeriodo(
  fechaInicio: string,
  fechaFin: string,
  config: PeriodosNominaConfig = DEFAULT_PERIODOS_NOMINA_CONFIG,
): "A" | "B" {
  const inicio = parseYmdLocal(fechaInicio);
  const fin = parseYmdLocal(fechaFin);

  if (matchesCorte(inicio, fin, config.a)) return "A";
  if (matchesCorte(inicio, fin, config.b)) return "B";
  if (finCoincideConCorte(fin, config.a) || inicio.getDate() === config.a.diaInicio) {
    return "A";
  }
  if (finCoincideConCorte(fin, config.b) || inicio.getDate() === config.b.diaInicio) {
    return "B";
  }
  if (config.a.diaFin !== 0 && fin.getDate() <= config.a.diaFin) return "A";
  return "B";
}

/**
 * Deriva el código de nómina (YYYYMMP). Alineado con backend.
 */
export function derivarCodigoNomina(
  fechaInicio: string,
  fechaFin: string,
  config: PeriodosNominaConfig = DEFAULT_PERIODOS_NOMINA_CONFIG,
): string {
  const fin = parseYmdLocal(fechaFin);
  const letra = clasificarPeriodo(fechaInicio, fechaFin, config);
  const año = fin.getFullYear();
  const mes = String(fin.getMonth() + 1).padStart(2, "0");
  return `${año}${mes}${letra}`;
}

export const MESES_LARGOS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function nombreMesFinIso(fechaFinIso: string): string {
  const m = Number(fechaFinIso.slice(5, 7));
  if (!m || m < 1 || m > 12) return "";
  return MESES_LARGOS_ES[m - 1];
}

export function etiquetaQuincenaAB(
  fin: Date,
  config: PeriodosNominaConfig = DEFAULT_PERIODOS_NOMINA_CONFIG,
): "A" | "B" {
  if (finCoincideConCorte(fin, config.a)) return "A";
  if (finCoincideConCorte(fin, config.b)) return "B";
  if (config.a.diaFin !== 0 && fin.getDate() <= config.a.diaFin) return "A";
  return "B";
}

function formatearFechaCorta(fecha: Date): string {
  const dia = fecha.getDate().toString().padStart(2, "0");
  const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const yy = String(fecha.getFullYear() % 100).padStart(2, "0");
  return `${dia}/${mes}/${yy}`;
}

export function construirIntervalosParaAño(
  año: number,
  config: PeriodosNominaConfig = DEFAULT_PERIODOS_NOMINA_CONFIG,
  hoy: Date = new Date(),
): IntervaloNominaCalculo[] {
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const esAñoActual = año === hoyNorm.getFullYear();
  const intervalos: IntervaloNominaCalculo[] = [];

  const incluir = (inicio: Date, fin: Date) => {
    if (!esAñoActual) return true;
    return fin <= hoyNorm || (hoyNorm >= inicio && hoyNorm <= fin);
  };

  for (let mesNomina = 1; mesNomina <= 12; mesNomina++) {
    for (const letra of ["B", "A"] as const) {
      const it = construirIntervalo(año, mesNomina, letra, config);
      const inicio = parseYmdLocal(it.fechaInicio);
      const fin = parseYmdLocal(it.fechaFin);
      if (!incluir(inicio, fin)) continue;
      intervalos.push({
        label: `${formatearFechaCorta(inicio)} - ${formatearFechaCorta(fin)} ${letra}`,
        fechaInicio: it.fechaInicio,
        fechaFin: it.fechaFin,
        valor: `${it.fechaInicio}_${it.fechaFin}`,
        letra,
      });
    }
  }

  intervalos.sort((a, b) =>
    a.fechaFin < b.fechaFin ? 1 : a.fechaFin > b.fechaFin ? -1 : 0,
  );
  return intervalos;
}

export function claveMesFinIso(fechaFin: string): string {
  return fechaFin.length >= 7 ? fechaFin.slice(0, 7) : fechaFin;
}

export function getNombrePeriodoNomina(
  iniISO: string,
  finISO: string,
  config: PeriodosNominaConfig = DEFAULT_PERIODOS_NOMINA_CONFIG,
): string {
  const fin = parseYmdLocal(finISO);
  const letra = clasificarPeriodo(iniISO, finISO, config);
  const mesFin = MESES_LARGOS_ES[fin.getMonth()];
  const añoFin = fin.getFullYear();
  const cual = letra === "A" ? "Primera" : "Segunda";
  return `${cual} quincena de ${mesFin} de ${añoFin}`;
}

export function periodoQueContiene(
  fecha: Date,
  config: PeriodosNominaConfig = DEFAULT_PERIODOS_NOMINA_CONFIG,
): { fechaInicio: string; fechaFin: string; letra: "A" | "B" } | null {
  const y = fecha.getFullYear();
  const m = fecha.getMonth() + 1;
  const candidates: Array<{ fechaInicio: string; fechaFin: string; letra: "A" | "B" }> = [];

  for (const delta of [-1, 0, 1]) {
    let año = y;
    let mes = m + delta;
    if (mes < 1) {
      mes = 12;
      año -= 1;
    } else if (mes > 12) {
      mes = 1;
      año += 1;
    }
    candidates.push(construirIntervalo(año, mes, "A", config));
    candidates.push(construirIntervalo(año, mes, "B", config));
  }

  const t = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  for (const c of candidates) {
    const ini = parseYmdLocal(c.fechaInicio);
    const fin = parseYmdLocal(c.fechaFin);
    if (t >= ini && t <= fin) return c;
  }
  return null;
}

export function describirCortes(config: PeriodosNominaConfig): string {
  const fmt = (c: CorteQuincena) => {
    const fin = c.diaFin === 0 ? "fin de mes" : String(c.diaFin);
    return `${c.diaInicio}–${fin}`;
  };
  return `${fmt(config.a)} o ${fmt(config.b)}`;
}

export function quincenaBYaEmpezo(
  hoy: Date,
  config: PeriodosNominaConfig,
): boolean {
  return hoy.getDate() >= config.b.diaInicio;
}

/** Días válidos de inicio de período (para DatePicker). */
export function diasInicioPermitidos(config: PeriodosNominaConfig): number[] {
  return [config.a.diaInicio, config.b.diaInicio];
}

/** Días válidos de fin (0 ⇒ se valida como último del mes en shouldDisable). */
export function diasFinPermitidos(config: PeriodosNominaConfig): number[] {
  const out = [config.a.diaFin, config.b.diaFin].filter((d) => d !== 0);
  return out;
}

export function esDiaFinPermitido(
  date: Date,
  config: PeriodosNominaConfig,
): boolean {
  const d = date.getDate();
  const last = lastDayOfMonth(date.getFullYear(), date.getMonth());
  if (config.a.diaFin === 0 && d === last) return true;
  if (config.b.diaFin === 0 && d === last) return true;
  if (config.a.diaFin !== 0 && d === config.a.diaFin) return true;
  if (config.b.diaFin !== 0 && d === config.b.diaFin) return true;
  return false;
}
