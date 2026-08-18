import { roundTo2Decimals } from "./formatters";

/** RAP: 1.5% del excedente sobre el piso IHSS. Si sueldo ≤ piso → 0. */
export function calcularRapBase(
  sueldoMensual: number,
  pisoIhss: number,
): number {
  const salario = sueldoMensual || 0;
  if (salario <= pisoIhss) return 0;
  return (salario - pisoIhss) * 0.015;
}

export interface DeduccionesAutomaticasPorCodigo {
  deduccionIHSS: number;
  deduccionRAP: number;
  deduccionISR: number;
  impuestoVecinal: number;
}

/**
 * Defaults de IHSS / RAP / ISR / impuesto vecinal según código A o B.
 * A (primera): 0. B (segunda): IHSS fijo, RAP = base + voluntario, ISR del colaborador.
 */
export function calcularDeduccionesAutomaticasPorCodigo(params: {
  codigoNominaTerminaEnA: boolean;
  sueldoMensual: number;
  pisoIhss: number;
  deduccionIhssFija: number;
  empleadoIsr?: number;
  empleadoAporteVoluntarioRap?: number;
}): DeduccionesAutomaticasPorCodigo {
  if (params.codigoNominaTerminaEnA) {
    return {
      deduccionIHSS: 0,
      deduccionRAP: 0,
      deduccionISR: 0,
      impuestoVecinal: 0,
    };
  }

  const valorRAP = roundTo2Decimals(
    calcularRapBase(params.sueldoMensual, params.pisoIhss) +
      (params.empleadoAporteVoluntarioRap || 0),
  );

  return {
    deduccionIHSS: roundTo2Decimals(params.deduccionIhssFija),
    deduccionRAP: valorRAP,
    deduccionISR: roundTo2Decimals(params.empleadoIsr || 0),
    impuestoVecinal: 0,
  };
}
