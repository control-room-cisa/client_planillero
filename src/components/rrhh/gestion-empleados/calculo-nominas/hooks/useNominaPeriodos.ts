import * as React from "react";
import {
  MIN_AÑO_NOMINA,
  construirIntervalosParaAño,
  getNombrePeriodoNomina as buildNombrePeriodoNomina,
  type IntervaloNominaCalculo,
} from "../utils/periodos";

export interface UseNominaPeriodosReturn {
  añoNominas: number;
  setAñoNominas: React.Dispatch<React.SetStateAction<number>>;
  añosDisponibles: number[];
  intervalosDelAño: IntervaloNominaCalculo[];
  intervaloSeleccionado: string;
  setIntervaloSeleccionado: React.Dispatch<React.SetStateAction<string>>;
  handleAñoNominasChange: (event: any) => void;
  handleIntervaloChange: (event: any) => void;
  fechaInicio: string;
  fechaFin: string;
  rangoValido: boolean;
  isPrimeraQuincena: boolean;
  codigoNominaTerminaEnA: boolean;
  codigoNominaPeriodo: string;
  nombrePeriodoNomina: string;
  getNombrePeriodoNomina: (iniISO: string, finISO: string) => string;
}

/**
 * Hook de selección de período de nómina.
 * Encapsula:
 *  - Año y años disponibles (selector).
 *  - Lista de intervalos (quincenas) para el año.
 *  - Intervalo seleccionado + fechas (inicio/fin).
 *  - Derivados: rangoValido, isPrimeraQuincena, codigoNominaTerminaEnA,
 *    codigoNominaPeriodo y nombrePeriodoNomina.
 */
export function useNominaPeriodos(): UseNominaPeriodosReturn {
  const [añoNominas, setAñoNominas] = React.useState<number>(() =>
    new Date().getFullYear(),
  );

  const añosDisponibles = React.useMemo(() => {
    const y = new Date().getFullYear();
    const list: number[] = [];
    for (let a = MIN_AÑO_NOMINA; a <= y; a++) list.push(a);
    return list.reverse();
  }, []);

  const intervalosDelAño = React.useMemo(
    () => construirIntervalosParaAño(añoNominas, new Date()),
    [añoNominas],
  );

  const [intervaloSeleccionado, setIntervaloSeleccionado] =
    React.useState<string>("");

  /** Evita depender de `intervaloSeleccionado` en el efecto de sync (re-disparaba el efecto en cada click y podía anular la selección). */
  const intervaloSeleccionadoRef = React.useRef(intervaloSeleccionado);
  intervaloSeleccionadoRef.current = intervaloSeleccionado;

  // Rango de fechas
  const [fechaInicio, setFechaInicio] = React.useState<string>("");
  const [fechaFin, setFechaFin] = React.useState<string>("");

  // Sincronizar período solo cuando cambia el año o la lista de intervalos (no al elegir otro período en el Select)
  React.useEffect(() => {
    if (intervalosDelAño.length === 0) {
      setIntervaloSeleccionado("");
      setFechaInicio("");
      setFechaFin("");
      return;
    }
    const actual = intervaloSeleccionadoRef.current;
    const sigueSiendoValido = intervalosDelAño.some((x) => x.valor === actual);
    if (sigueSiendoValido) return;
    const ultima = intervalosDelAño[0];
    setIntervaloSeleccionado(ultima.valor);
    setFechaInicio(ultima.fechaInicio);
    setFechaFin(ultima.fechaFin);
  }, [añoNominas, intervalosDelAño]);

  const rangoValido =
    !!fechaInicio && !!fechaFin && new Date(fechaFin) >= new Date(fechaInicio);

  const handleAñoNominasChange = (event: any) => {
    const v = Number(event.target.value);
    if (
      Number.isFinite(v) &&
      v >= MIN_AÑO_NOMINA &&
      v <= new Date().getFullYear()
    ) {
      setAñoNominas(v);
    }
  };

  const handleIntervaloChange = (event: any) => {
    const valor = String(event.target.value ?? "");
    setIntervaloSeleccionado(valor);
    intervaloSeleccionadoRef.current = valor;

    if (valor) {
      const [inicio, fin] = valor.split("_");
      setFechaInicio(inicio);
      setFechaFin(fin);
    } else {
      setFechaInicio("");
      setFechaFin("");
    }
  };

  // Determinar si es primera quincena para reglas de deducciones
  const isPrimeraQuincena = React.useMemo(() => {
    if (!fechaInicio || !fechaFin) return false;
    const toDate = (s: string) =>
      new Date(s + (s.length === 10 ? "T00:00:00" : ""));
    const ini = toDate(fechaInicio);
    const fin = toDate(fechaFin);
    const diaFin = fin.getDate();
    const diaIni = ini.getDate();
    if (diaFin === 11) return true;
    if (diaFin === 26) return false;
    if (diaIni === 27) return true;
    if (diaIni === 12) return false;
    return false;
  }, [fechaInicio, fechaFin]);

  // Determinar si el código de nómina termina en "A" o "B"
  // A = Primera quincena (días 27-11), B = Segunda quincena (días 12-26)
  const codigoNominaTerminaEnA = React.useMemo(() => {
    if (!fechaInicio || !fechaFin) return false;
    const toDate = (s: string) =>
      new Date(s + (s.length === 10 ? "T00:00:00" : ""));
    const ini = toDate(fechaInicio);
    const fin = toDate(fechaFin);
    const diaFin = fin.getDate();
    const diaIni = ini.getDate();
    // Primera quincena (A): días 27-11
    if (diaFin === 11 || diaIni === 27) return true;
    // Segunda quincena (B): días 12-26
    if (diaFin === 26 || diaIni === 12) return false;
    // Fallback: si el día fin es <= 15, es primera quincena (A)
    return diaFin <= 15;
  }, [fechaInicio, fechaFin]);

  const codigoNominaPeriodo = React.useMemo(() => {
    if (!fechaFin) return "";
    const fin = new Date(fechaFin + (fechaFin.length === 10 ? "T00:00:00" : ""));
    if (Number.isNaN(fin.getTime())) return "";
    const anio = fin.getFullYear();
    const mes = String(fin.getMonth() + 1).padStart(2, "0");
    const periodo = codigoNominaTerminaEnA ? "A" : "B";
    return `${anio}${mes}${periodo}`;
  }, [fechaFin, codigoNominaTerminaEnA]);

  const getNombrePeriodoNomina = React.useCallback(
    (iniISO: string, finISO: string) =>
      buildNombrePeriodoNomina(iniISO, finISO),
    [],
  );

  const nombrePeriodoNomina = React.useMemo(
    () =>
      fechaInicio && fechaFin
        ? getNombrePeriodoNomina(fechaInicio, fechaFin)
        : "",
    [fechaInicio, fechaFin, getNombrePeriodoNomina],
  );

  return {
    añoNominas,
    setAñoNominas,
    añosDisponibles,
    intervalosDelAño,
    intervaloSeleccionado,
    setIntervaloSeleccionado,
    handleAñoNominasChange,
    handleIntervaloChange,
    fechaInicio,
    fechaFin,
    rangoValido,
    isPrimeraQuincena,
    codigoNominaTerminaEnA,
    codigoNominaPeriodo,
    nombrePeriodoNomina,
    getNombrePeriodoNomina,
  };
}
