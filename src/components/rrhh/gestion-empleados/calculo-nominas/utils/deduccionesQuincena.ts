import { roundTo2Decimals } from "./formatters";

/** Cómo repartir una deducción que históricamente iba solo en B. */
export type ModoDeduccionQuincena = "SOLO_A" | "SOLO_B" | "AMBAS_MITAD";

export const MODOS_DEDUCCION_QUINCENA: ModoDeduccionQuincena[] = [
  "SOLO_B",
  "SOLO_A",
  "AMBAS_MITAD",
];

export const LABELS_MODO_DEDUCCION: Record<ModoDeduccionQuincena, string> = {
  SOLO_B: "Solo segunda quincena (B)",
  SOLO_A: "Solo primera quincena (A)",
  AMBAS_MITAD: "Dividido entre ambas quincenas",
};

export const GLOBAL_CONFIG_KEYS_DEDUCCION_MODO = {
  ihss: "DEDUCCION_IHSS_MODO",
  rap: "DEDUCCION_RAP_MODO",
  isr: "DEDUCCION_ISR_MODO",
  impuestoVecinal: "IMPUESTO_VECINAL_MODO",
} as const;

export const DEFAULT_MODO_DEDUCCION: ModoDeduccionQuincena = "SOLO_B";

export function parseModoDeduccionQuincena(
  value: string | null | undefined,
): ModoDeduccionQuincena {
  const v = String(value || "")
    .trim()
    .toUpperCase();
  if (v === "SOLO_A" || v === "SOLO_B" || v === "AMBAS_MITAD") return v;
  return DEFAULT_MODO_DEDUCCION;
}

/** ¿La deducción aplica (con monto > 0 posible) en este período? */
export function deduccionAplicaEnPeriodo(
  modo: ModoDeduccionQuincena,
  esPeriodoA: boolean,
): boolean {
  if (modo === "SOLO_A") return esPeriodoA;
  if (modo === "SOLO_B") return !esPeriodoA;
  return true;
}

/** Factor sobre el monto mensual: 1, 0.5 o 0. */
export function factorMontoDeduccion(
  modo: ModoDeduccionQuincena,
  esPeriodoA: boolean,
): number {
  if (!deduccionAplicaEnPeriodo(modo, esPeriodoA)) return 0;
  if (modo === "AMBAS_MITAD") return 0.5;
  return 1;
}

/** RAP: 1.5% del excedente sobre el piso IHSS. Si sueldo ≤ piso → 0. */
export function calcularRapBase(
  sueldoMensual: number,
  pisoIhss: number,
): number {
  const salario = sueldoMensual || 0;
  if (salario <= pisoIhss) return 0;
  return (salario - pisoIhss) * 0.015;
}

export interface PoliticaDeduccionesQuincena {
  ihss: ModoDeduccionQuincena;
  rap: ModoDeduccionQuincena;
  isr: ModoDeduccionQuincena;
  impuestoVecinal: ModoDeduccionQuincena;
}

export const DEFAULT_POLITICA_DEDUCCIONES: PoliticaDeduccionesQuincena = {
  ihss: DEFAULT_MODO_DEDUCCION,
  rap: DEFAULT_MODO_DEDUCCION,
  isr: DEFAULT_MODO_DEDUCCION,
  impuestoVecinal: DEFAULT_MODO_DEDUCCION,
};

export interface DeduccionesAutomaticasPorCodigo {
  deduccionIHSS: number;
  deduccionRAP: number;
  deduccionISR: number;
  impuestoVecinal: number;
}

/**
 * Defaults de IHSS / RAP / ISR / impuesto vecinal según código A o B
 * y la política de reparto (SOLO_A / SOLO_B / AMBAS_MITAD).
 *
 * Montos base se tratan como mensuales; en AMBAS_MITAD se aplica la mitad.
 * Impuesto vecinal no tiene monto automático (sigue en 0); la política
 * solo indica en qué quincena se considera aplicable.
 */
export function calcularDeduccionesAutomaticasPorCodigo(params: {
  codigoNominaTerminaEnA: boolean;
  sueldoMensual: number;
  pisoIhss: number;
  deduccionIhssFija: number;
  empleadoIsr?: number;
  empleadoAporteVoluntarioRap?: number;
  politica?: Partial<PoliticaDeduccionesQuincena>;
}): DeduccionesAutomaticasPorCodigo {
  const politica: PoliticaDeduccionesQuincena = {
    ...DEFAULT_POLITICA_DEDUCCIONES,
    ...params.politica,
  };
  const esA = params.codigoNominaTerminaEnA;

  const factorIhss = factorMontoDeduccion(politica.ihss, esA);
  const factorRap = factorMontoDeduccion(politica.rap, esA);
  const factorIsr = factorMontoDeduccion(politica.isr, esA);
  // Sin monto base configurado; se deja 0 (la UI/manual define el valor).
  const factorVecinal = factorMontoDeduccion(politica.impuestoVecinal, esA);

  const rapMensual =
    calcularRapBase(params.sueldoMensual, params.pisoIhss) +
    (params.empleadoAporteVoluntarioRap || 0);

  return {
    deduccionIHSS: roundTo2Decimals(
      (params.deduccionIhssFija || 0) * factorIhss,
    ),
    deduccionRAP: roundTo2Decimals(rapMensual * factorRap),
    deduccionISR: roundTo2Decimals((params.empleadoIsr || 0) * factorIsr),
    // No hay monto automático de vecinal; factor solo documenta aplicabilidad.
    impuestoVecinal: roundTo2Decimals(0 * factorVecinal),
  };
}
