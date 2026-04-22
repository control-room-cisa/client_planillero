import * as React from "react";
import { roundTo2Decimals } from "../utils/formatters";

export interface UseDeduccionesNominaParams {
  // Condiciones de período
  fechaInicio: string;
  fechaFin: string;
  codigoNominaTerminaEnA: boolean;
  isPrimeraQuincena: boolean;

  // Contexto económico
  sueldoMensual: number;
  PISO_IHSS: number;
  DEDUCCION_IHSS_FIJA: number;

  // Días de incapacidad (del resumen)
  diasIncapacidadCubreEmpresa: number;
  diasIncapacidadCubreIHSS: number;
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
  inputMontoExcedenteIHSS: string;
  setInputMontoExcedenteIHSS: React.Dispatch<React.SetStateAction<string>>;

  // Derivados
  deduccionRAPBase: number;
  montoIncapacidadIHSSCalculado: number;
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
  PISO_IHSS,
  DEDUCCION_IHSS_FIJA,
  diasIncapacidadCubreEmpresa,
  diasIncapacidadCubreIHSS,
}: UseDeduccionesNominaParams): UseDeduccionesNominaReturn {
  // Cálculo de montos de incapacidad según fórmulas especificadas
  // Monto incapacidad IHSS: diasIncapacidadIHSS * (PISO_IHSS * 0.66) / 30
  const montoIncapacidadIHSSCalculado = React.useMemo(() => {
    if (!diasIncapacidadCubreIHSS) return 0;
    return roundTo2Decimals((diasIncapacidadCubreIHSS * PISO_IHSS * 0.66) / 30);
  }, [diasIncapacidadCubreIHSS, PISO_IHSS]);

  // Monto incapacidad cubre empresa: ((diasIncapacidadIHSS + diasIncapacidadEmpresa) * SalarioMensual / 30) - MontoIncapacidadIHSS
  const montoCubreEmpresaCalculado = React.useMemo(() => {
    if (!sueldoMensual) return 0;
    const totalDiasIncapacidad =
      diasIncapacidadCubreIHSS + diasIncapacidadCubreEmpresa;
    const montoTotalIncapacidad = (totalDiasIncapacidad * sueldoMensual) / 30;
    const montoIHSS = montoIncapacidadIHSSCalculado;
    return roundTo2Decimals(Math.max(0, montoTotalIncapacidad - montoIHSS));
  }, [
    sueldoMensual,
    diasIncapacidadCubreEmpresa,
    diasIncapacidadCubreIHSS,
    montoIncapacidadIHSSCalculado,
  ]);

  // Estado editable para incapacidad cubierta por empresa (inicial por cálculo)
  const [montoIncapacidadCubreEmpresa, setMontoIncapacidadCubreEmpresa] =
    React.useState<number>(montoCubreEmpresaCalculado || 0);

  // Estado editable para incapacidad IHSS (solo informativo, no se suma a totales)
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
  const [inputMontoExcedenteIHSS, setInputMontoExcedenteIHSS] =
    React.useState<string>("");

  // Cálculo de RAP: 1.5% (0.015) del excedente sobre piso IHSS
  // Si Salario ≤ 11,903.13 → Base = 0
  // Si Salario > 11,903.13 → Base = (Salario - 11,903.13) * 0.015
  const deduccionRAPBase = React.useMemo(() => {
    const salario = sueldoMensual || 0;
    if (salario <= PISO_IHSS) return 0;
    return (salario - PISO_IHSS) * 0.015;
  }, [sueldoMensual, PISO_IHSS]);

  // Defaults automáticos para IHSS y RAP
  // Solo se calculan si el código de nómina termina en "B" (segunda quincena)
  // Si termina en "A" (primera quincena), todas las deducciones deben ser 0
  React.useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    if (codigoNominaTerminaEnA) {
      // Primera quincena (A): todas las deducciones en 0
      setDeduccionIHSS(0);
      setInputDeduccionIHSS("");
      setDeduccionRAP(0);
      setInputDeduccionRAP("");
    } else {
      // Segunda quincena (B): calcular deducciones normalmente
      // IHSS siempre es 595.16
      const valorIHSS = DEDUCCION_IHSS_FIJA;
      const redondeadoIHSS = roundTo2Decimals(valorIHSS);
      setDeduccionIHSS(redondeadoIHSS);
      setInputDeduccionIHSS(String(redondeadoIHSS));

      // RAP se calcula automáticamente según el salario
      const valorRAP = deduccionRAPBase;
      const redondeadoRAP = roundTo2Decimals(valorRAP);
      setDeduccionRAP(redondeadoRAP);
      setInputDeduccionRAP(valorRAP > 0 ? String(redondeadoRAP) : "");
    }
  }, [
    fechaInicio,
    fechaFin,
    deduccionRAPBase,
    codigoNominaTerminaEnA,
    DEDUCCION_IHSS_FIJA,
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
      // Segunda quincena (B): resetear pero permitir edición
      setDeduccionISR(0);
      setCobroPrestamo(0);
      setImpuestoVecinal(0);
      // Otros NO se resetea automáticamente - siempre editable
      setInputDeduccionISR("");
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
    inputMontoExcedenteIHSS,
    setInputMontoExcedenteIHSS,

    deduccionRAPBase,
    montoIncapacidadIHSSCalculado,
    montoCubreEmpresaCalculado,
  };
}
