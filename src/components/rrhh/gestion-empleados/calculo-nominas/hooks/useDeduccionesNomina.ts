import * as React from "react";
import {
  montoPorDiasQuincena,
  roundTo2Decimals,
} from "../utils/formatters";
import {
  calcularDeduccionesAutomaticasPorCodigo,
  calcularRapBase,
} from "../utils/deduccionesQuincena";

export interface UseDeduccionesNominaParams {
  // Condiciones de período
  fechaInicio: string;
  fechaFin: string;
  codigoNominaTerminaEnA: boolean;
  isPrimeraQuincena: boolean;

  // Contexto económico
  sueldoMensual: number;
  salarioQuincenal: number;
  PISO_IHSS: number;
  DEDUCCION_IHSS_FIJA: number;

  /**
   * Días incapacidad en base 15 (LRM) — cuadre planilla.
   * diasLaborados + vac + perm + incapEmpresa(LRM) + incapIHSS(LRM) = 15
   */
  diasIncapacidadCubreEmpresa: number;
  diasIncapacidadCubreIHSS: number;

  /** Monto IHSS: días calendario literales en quincena × subsidioDiario (backend). */
  montoIncapacidadIHSSFromBackend?: number;

  /** Deducciones predefinidas del colaborador (solo aplican en quincena B) */
  empleadoIsr?: number;
  empleadoAporteVoluntarioRap?: number;
}

export interface UseDeduccionesNominaReturn {
  // Valores numéricos "oficiales" usados en totales
  montoIncapacidadCubreEmpresa: number;
  setMontoIncapacidadCubreEmpresa: React.Dispatch<
    React.SetStateAction<number>
  >;
  montoIncapacidadIHSS: number;
  setMontoIncapacidadIHSS: React.Dispatch<React.SetStateAction<number>>;
  ajuste: number;
  setAjuste: React.Dispatch<React.SetStateAction<number>>;
  montoExcedenteIHSS: number;
  setMontoExcedenteIHSS: React.Dispatch<React.SetStateAction<number>>;
  deduccionIHSS: number;
  setDeduccionIHSS: React.Dispatch<React.SetStateAction<number>>;
  deduccionRAP: number;
  setDeduccionRAP: React.Dispatch<React.SetStateAction<number>>;
  deduccionISR: number;
  setDeduccionISR: React.Dispatch<React.SetStateAction<number>>;
  cobroPrestamo: number;
  setCobroPrestamo: React.Dispatch<React.SetStateAction<number>>;
  impuestoVecinal: number;
  setImpuestoVecinal: React.Dispatch<React.SetStateAction<number>>;
  otros: number;
  setOtros: React.Dispatch<React.SetStateAction<number>>;
  /** Deducción de alojamiento (editable en cualquier quincena, inicializa en 0) */
  deduccionAlojamiento: number;
  setDeduccionAlojamiento: React.Dispatch<React.SetStateAction<number>>;
  comentario: string;
  setComentario: React.Dispatch<React.SetStateAction<string>>;

  // Inputs "string" para UI (permiten estados intermedios como "0." o "15.")
  inputMontoIncapacidadEmpresa: string;
  setInputMontoIncapacidadEmpresa: React.Dispatch<
    React.SetStateAction<string>
  >;
  inputMontoIncapacidadIHSS: string;
  setInputMontoIncapacidadIHSS: React.Dispatch<React.SetStateAction<string>>;
  inputAjuste: string;
  setInputAjuste: React.Dispatch<React.SetStateAction<string>>;
  inputDeduccionIHSS: string;
  setInputDeduccionIHSS: React.Dispatch<React.SetStateAction<string>>;
  inputDeduccionISR: string;
  setInputDeduccionISR: React.Dispatch<React.SetStateAction<string>>;
  inputDeduccionRAP: string;
  setInputDeduccionRAP: React.Dispatch<React.SetStateAction<string>>;
  inputCobroPrestamo: string;
  setInputCobroPrestamo: React.Dispatch<React.SetStateAction<string>>;
  inputImpuestoVecinal: string;
  setInputImpuestoVecinal: React.Dispatch<React.SetStateAction<string>>;
  inputOtros: string;
  setInputOtros: React.Dispatch<React.SetStateAction<string>>;
  inputDeduccionAlojamiento: string;
  setInputDeduccionAlojamiento: React.Dispatch<React.SetStateAction<string>>;
  inputMontoExcedenteIHSS: string;
  setInputMontoExcedenteIHSS: React.Dispatch<React.SetStateAction<string>>;

  // Derivados
  deduccionRAPBase: number;
  montoIncapacidadIHSSCalculado: number;
  /** (días incap LRM empresa + IHSS) × salarioQuincenal / 15 */
  montoIncapacidadTotalCalculado: number;
  montoCubreEmpresaCalculado: number;
}

/**
 * Hook de deducciones/ajustes/comentario de la nómina.
 * Mantiene los efectos existentes (sin cambios de lógica):
 *  - Cálculo automático de incapacidades (IHSS / empresa) a partir de días.
 *  - Default automático de IHSS/RAP por quincena A/B.
 *  - Sincronización de inputs strings con los valores numéricos.
 *  - Reset de inputs al cambiar período.
 *  - Regla específica de Impuesto Vecinal en primera quincena.
 */
export function useDeduccionesNomina({
  fechaInicio,
  fechaFin,
  codigoNominaTerminaEnA,
  isPrimeraQuincena,
  sueldoMensual,
  salarioQuincenal,
  PISO_IHSS,
  DEDUCCION_IHSS_FIJA,
  diasIncapacidadCubreEmpresa,
  diasIncapacidadCubreIHSS,
  montoIncapacidadIHSSFromBackend,
  empleadoIsr = 0,
  empleadoAporteVoluntarioRap = 0,
}: UseDeduccionesNominaParams): UseDeduccionesNominaReturn {
  // IHSS: monto literal (días calendario × subsidio); no usa días LRM
  const montoIncapacidadIHSSCalculado = React.useMemo(() => {
    if (montoIncapacidadIHSSFromBackend != null) {
      return roundTo2Decimals(montoIncapacidadIHSSFromBackend);
    }
    return 0;
  }, [montoIncapacidadIHSSFromBackend]);

  // Total incapacidad (LRM base 15) menos IHSS literal → cubre empresa
  const montoIncapacidadTotalCalculado = React.useMemo(() => {
    const totalDiasIncapacidadLrm =
      diasIncapacidadCubreEmpresa + diasIncapacidadCubreIHSS;
    if (!totalDiasIncapacidadLrm || !salarioQuincenal) return 0;
    return montoPorDiasQuincena(salarioQuincenal, totalDiasIncapacidadLrm, 15);
  }, [
    salarioQuincenal,
    diasIncapacidadCubreEmpresa,
    diasIncapacidadCubreIHSS,
  ]);

  const montoCubreEmpresaCalculado = React.useMemo(() => {
    return roundTo2Decimals(
      Math.max(0, montoIncapacidadTotalCalculado - montoIncapacidadIHSSCalculado)
    );
  }, [montoIncapacidadTotalCalculado, montoIncapacidadIHSSCalculado]);

  // Estado editable para incapacidad cubierta por empresa (inicial por cálculo)
  const [montoIncapacidadCubreEmpresa, setMontoIncapacidadCubreEmpresa] =
    React.useState<number>(montoCubreEmpresaCalculado || 0);

  // Estado editable para incapacidad IHSS (solo informativo, no suma al total a pagar)
  const [montoIncapacidadIHSS, setMontoIncapacidadIHSS] =
    React.useState<number>(montoIncapacidadIHSSCalculado || 0);

  // Estados de deducciones/ajustes
  const [ajuste, setAjuste] = React.useState<number>(0);
  const [montoExcedenteIHSS, setMontoExcedenteIHSS] = React.useState<number>(0);
  const [deduccionIHSS, setDeduccionIHSS] = React.useState<number>(0);
  const [deduccionRAP, setDeduccionRAP] = React.useState<number>(0);
  const [deduccionISR, setDeduccionISR] = React.useState<number>(0);
  const [cobroPrestamo, setCobroPrestamo] = React.useState<number>(0);
  const [impuestoVecinal, setImpuestoVecinal] = React.useState<number>(0);
  const [otros, setOtros] = React.useState<number>(0);
  const [deduccionAlojamiento, setDeduccionAlojamiento] =
    React.useState<number>(0);
  const [comentario, setComentario] = React.useState<string>("");

  // Estados string para UI (permiten estados intermedios como "0." o "15.")
  const [inputMontoIncapacidadEmpresa, setInputMontoIncapacidadEmpresa] =
    React.useState<string>("");
  const [inputMontoIncapacidadIHSS, setInputMontoIncapacidadIHSS] =
    React.useState<string>("");
  const [inputAjuste, setInputAjuste] = React.useState<string>("");
  const [inputDeduccionIHSS, setInputDeduccionIHSS] =
    React.useState<string>("");
  const [inputDeduccionISR, setInputDeduccionISR] = React.useState<string>("");
  const [inputDeduccionRAP, setInputDeduccionRAP] = React.useState<string>("");
  const [inputCobroPrestamo, setInputCobroPrestamo] =
    React.useState<string>("");
  const [inputImpuestoVecinal, setInputImpuestoVecinal] =
    React.useState<string>("");
  const [inputOtros, setInputOtros] = React.useState<string>("");
  const [inputDeduccionAlojamiento, setInputDeduccionAlojamiento] =
    React.useState<string>("");
  const [inputMontoExcedenteIHSS, setInputMontoExcedenteIHSS] =
    React.useState<string>("");

  // Cálculo de RAP: 1.5% (0.015) del excedente sobre piso IHSS
  // Si Salario ≤ 11,903.13 → Base = 0
  // Si Salario > 11,903.13 → Base = (Salario - 11,903.13) * 0.015
  const deduccionRAPBase = React.useMemo(
    () => calcularRapBase(sueldoMensual, PISO_IHSS),
    [sueldoMensual, PISO_IHSS],
  );

  // Defaults automáticos para IHSS, RAP e ISR según código A/B
  React.useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    const auto = calcularDeduccionesAutomaticasPorCodigo({
      codigoNominaTerminaEnA,
      sueldoMensual,
      pisoIhss: PISO_IHSS,
      deduccionIhssFija: DEDUCCION_IHSS_FIJA,
      empleadoIsr,
      empleadoAporteVoluntarioRap,
    });

    setDeduccionIHSS(auto.deduccionIHSS);
    setInputDeduccionIHSS(
      auto.deduccionIHSS > 0 ? String(auto.deduccionIHSS) : "",
    );
    setDeduccionRAP(auto.deduccionRAP);
    setInputDeduccionRAP(auto.deduccionRAP > 0 ? String(auto.deduccionRAP) : "");
    setDeduccionISR(auto.deduccionISR);
    setInputDeduccionISR(auto.deduccionISR > 0 ? String(auto.deduccionISR) : "");
  }, [
    fechaInicio,
    fechaFin,
    sueldoMensual,
    codigoNominaTerminaEnA,
    PISO_IHSS,
    DEDUCCION_IHSS_FIJA,
    empleadoIsr,
    empleadoAporteVoluntarioRap,
  ]);

  // Sincronizar montoIncapacidadCubreEmpresa con su input string
  React.useEffect(() => {
    setInputMontoIncapacidadEmpresa(
      montoIncapacidadCubreEmpresa > 0
        ? String(montoIncapacidadCubreEmpresa)
        : "",
    );
  }, [montoIncapacidadCubreEmpresa]);

  // Actualizar montos de incapacidad cuando cambian los cálculos
  React.useEffect(() => {
    setMontoIncapacidadCubreEmpresa(montoCubreEmpresaCalculado);
  }, [montoCubreEmpresaCalculado]);

  React.useEffect(() => {
    setMontoIncapacidadIHSS(montoIncapacidadIHSSCalculado);
  }, [montoIncapacidadIHSSCalculado]);

  // Sincronizar montoIncapacidadIHSS con su input string
  React.useEffect(() => {
    setInputMontoIncapacidadIHSS(
      montoIncapacidadIHSS > 0 ? String(montoIncapacidadIHSS) : "",
    );
  }, [montoIncapacidadIHSS]);

  // Resetear inputs al cambiar período (excepto IHSS, RAP, Alimentación y Otros)
  // Alimentación: se carga siempre (A y B)
  // Otros: siempre editable, no se resetea automáticamente
  React.useEffect(() => {
    setAjuste(0);
    setMontoExcedenteIHSS(0);

    // Si es primera quincena (A), algunas deducciones deben ser 0
    // Alimentación y Otros son excepciones: se aplican siempre (A y B)
    if (codigoNominaTerminaEnA) {
      setDeduccionISR(0);
      setCobroPrestamo(0);
      setImpuestoVecinal(0);
      // Otros NO se resetea - siempre editable
      setInputDeduccionISR("");
      setInputCobroPrestamo("");
      setInputImpuestoVecinal("");
      // inputOtros NO se resetea - siempre editable
    } else {
      // Segunda quincena (B): ISR/RAP se recargan del colaborador en el efecto de defaults
      setCobroPrestamo(0);
      setImpuestoVecinal(0);
      setInputCobroPrestamo("");
      setInputImpuestoVecinal("");
      // inputOtros NO se resetea - siempre editable
    }

    setComentario("");
    // Resetear también los inputs string (excepto IHSS, RAP, Alimentación y Otros)
    setInputAjuste("");
    setInputMontoExcedenteIHSS("");
    // inputDeduccionAlimentacion NO se resetea aquí - se carga desde el servicio
    // inputOtros NO se resetea - siempre editable
    // Resetear error de alimentación al cambiar período
    // (se gestiona en useAlimentacionPorCodigo).
  }, [fechaInicio, fechaFin, codigoNominaTerminaEnA]);

  React.useEffect(() => {
    if (isPrimeraQuincena) {
      // En primera quincena se mantiene Alimentación y ahora ISR/Préstamo son editables.
      // Mantener Impuesto Vecinal en 0 por defecto.
      setImpuestoVecinal(0);
    }
  }, [isPrimeraQuincena]);

  return {
    montoIncapacidadCubreEmpresa,
    setMontoIncapacidadCubreEmpresa,
    montoIncapacidadIHSS,
    setMontoIncapacidadIHSS,
    ajuste,
    setAjuste,
    montoExcedenteIHSS,
    setMontoExcedenteIHSS,
    deduccionIHSS,
    setDeduccionIHSS,
    deduccionRAP,
    setDeduccionRAP,
    deduccionISR,
    setDeduccionISR,
    cobroPrestamo,
    setCobroPrestamo,
    impuestoVecinal,
    setImpuestoVecinal,
    otros,
    setOtros,
    deduccionAlojamiento,
    setDeduccionAlojamiento,
    comentario,
    setComentario,

    inputMontoIncapacidadEmpresa,
    setInputMontoIncapacidadEmpresa,
    inputMontoIncapacidadIHSS,
    setInputMontoIncapacidadIHSS,
    inputAjuste,
    setInputAjuste,
    inputDeduccionIHSS,
    setInputDeduccionIHSS,
    inputDeduccionISR,
    setInputDeduccionISR,
    inputDeduccionRAP,
    setInputDeduccionRAP,
    inputCobroPrestamo,
    setInputCobroPrestamo,
    inputImpuestoVecinal,
    setInputImpuestoVecinal,
    inputOtros,
    setInputOtros,
    inputDeduccionAlojamiento,
    setInputDeduccionAlojamiento,
    inputMontoExcedenteIHSS,
    setInputMontoExcedenteIHSS,

    deduccionRAPBase,
    montoIncapacidadIHSSCalculado,
    montoIncapacidadTotalCalculado,
    montoCubreEmpresaCalculado,
  };
}
