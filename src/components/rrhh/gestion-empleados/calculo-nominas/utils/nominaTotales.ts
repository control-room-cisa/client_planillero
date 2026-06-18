import type { NominaDto } from "../../../../../dtos/nominaDto";
import { roundTo2Decimals } from "./formatters";

/** Total bruto: subtotal quincena (alineado con CalculoNominas y Prorrateo resumen). */
export function calcularTotalBrutoNomina(nomina: NominaDto): number {
  return roundTo2Decimals(nomina.subtotalQuincena ?? 0);
}

/** Total deducciones: valor guardado o suma de las 8 deducciones. */
export function calcularTotalDeduccionesNomina(nomina: NominaDto): number {
  if (nomina.totalDeducciones != null) {
    return roundTo2Decimals(nomina.totalDeducciones);
  }
  return roundTo2Decimals(
    (nomina.deduccionIHSS ?? 0) +
      (nomina.deduccionISR ?? 0) +
      (nomina.deduccionRAP ?? 0) +
      (nomina.deduccionAlimentacion ?? 0) +
      (nomina.deduccionAlojamiento ?? 0) +
      (nomina.cobroPrestamo ?? 0) +
      (nomina.impuestoVecinal ?? 0) +
      (nomina.otros ?? 0),
  );
}

/** Total a pagar = total bruto − total deducciones. */
export function calcularTotalAPagarNomina(nomina: NominaDto): number {
  return roundTo2Decimals(
    calcularTotalBrutoNomina(nomina) - calcularTotalDeduccionesNomina(nomina),
  );
}

export function calcularTotalHorasExtraNomina(nomina: NominaDto): number {
  return roundTo2Decimals(
    (nomina.montoHoras25 ?? 0) +
      (nomina.montoHoras50 ?? 0) +
      (nomina.montoHoras75 ?? 0) +
      (nomina.montoHoras100 ?? 0),
  );
}
