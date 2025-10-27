import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Card,
  CardContent,
  Divider,
  Container,
  IconButton,
  FormControl,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Snackbar,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { Empleado } from "../../../services/empleadoService";
import type { EmpleadoIndexItem, LayoutOutletCtx } from "../../Layout";
import { useHorasTrabajo } from "../../../hooks/useHorasTrabajo";
import DesgloseIncidenciasComponent from "./DesgloseIncidencias";
import EmpleadoService from "../../../services/empleadoService";
import NominaService, {
  type CrearNominaDto,
} from "../../../services/nominaService";

interface NominasDashboardProps {
  empleado?: Empleado;
  empleadosIndex?: EmpleadoIndexItem[];
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const DEBUG = true;

// Utilidad de redondeo a 2 decimales
const roundTo2Decimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Sanitiza entrada mientras el usuario escribe: solo permite números y punto decimal
const sanitizeDecimalInput = (value: string): string => {
  if (!value) return "";

  // Eliminar todo excepto números y punto
  let cleaned = value.replace(/[^0-9.]/g, "");

  // Permitir solo un punto decimal
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  // Limitar decimales a 2 dígitos (pero permitir escribir el punto)
  if (parts.length === 2 && parts[1] && parts[1].length > 2) {
    cleaned = parts[0] + "." + parts[1].substring(0, 2);
  }

  // Eliminar ceros a la izquierda excepto "0." o "0" o si está vacío
  if (cleaned.length > 1 && cleaned[0] === "0" && cleaned[1] !== ".") {
    cleaned = cleaned.replace(/^0+/, "") || "0";
  }

  return cleaned;
};

// Convierte string a número para guardar en estado
const parseDecimalValue = (value: string): number => {
  if (!value || value === "." || value === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return roundTo2Decimals(num);
};

const NominasDashboard: React.FC<NominasDashboardProps> = ({
  empleado: empleadoProp,
  empleadosIndex: empleadosIndexProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { selectedEmpleado, empleadosIndex: empleadosIndexCtx } =
    useOutletContext<LayoutOutletCtx>();

  // Leer filtros previos si existen
  const { selectedEmpresaId, searchTerm } = location.state ?? {};

  const goBackToList = () => {
    navigate("/rrhh/colaboradores", {
      state: {
        selectedEmpresaId,
        searchTerm,
      },
    });
  };

  // Orígenes
  const empleadoInicial =
    empleadoProp ?? selectedEmpleado ?? location?.state?.empleado ?? null;

  const indiceEntrante: EmpleadoIndexItem[] =
    empleadosIndexProp ??
    empleadosIndexCtx ??
    location?.state?.empleadosIndex ??
    [];

  // Empleado actual navegable
  const [empleado, setEmpleado] = React.useState<Empleado | null>(
    empleadoInicial
  );

  // Derivar índice (no se congela)
  const empleadosIndex: EmpleadoIndexItem[] = React.useMemo(
    () => indiceEntrante ?? [],
    [indiceEntrante]
  );

  React.useEffect(() => {
    if (DEBUG) {
      console.debug("[NominasDashboard] mount", {
        empleadoInicialId: empleadoInicial?.id,
        indiceEntranteLen: indiceEntrante?.length ?? 0,
        empleadosIndexCtxLen: empleadosIndexCtx?.length ?? 0,
        empleadosIndexPropLen: empleadosIndexProp?.length ?? 0,
        locationState: location?.state,
      });
    }
  }, []); // mount

  // Función para generar los intervalos de fechas predefinidos
  const generarIntervalosFechas = React.useCallback(() => {
    const intervalos = [];
    const hoy = new Date();
    // Normalizar la fecha de hoy a medianoche para comparación
    const hoyNormalizado = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    for (let i = 0; i < 30; i++) {
      const fechaBase = new Date(hoy);
      fechaBase.setMonth(hoy.getMonth() - i);

      const año = fechaBase.getFullYear();
      const mes = fechaBase.getMonth();

      const inicio1 = new Date(año, mes, 12);
      const fin1 = new Date(año, mes, 26);

      const inicio2 = new Date(año, mes, 27);
      const fin2 = new Date(año, mes + 1, 11);

      const formatearFecha = (fecha: Date) => {
        const dia = fecha.getDate().toString().padStart(2, "0");
        const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
        const año = fecha.getFullYear();
        return `${dia}/${mes}/${año}`;
      };

      // Solo agregar período 1 si su fecha de inicio no es futura
      if (inicio1 <= hoyNormalizado) {
        intervalos.push({
          label: `${formatearFecha(inicio1)} - ${formatearFecha(fin1)}`,
          fechaInicio: inicio1.toISOString().split("T")[0],
          fechaFin: fin1.toISOString().split("T")[0],
          valor: `${inicio1.toISOString().split("T")[0]}_${
            fin1.toISOString().split("T")[0]
          }`,
        });
      }

      // Solo agregar período 2 si su fecha de inicio no es futura
      if (inicio2 <= hoyNormalizado) {
        intervalos.push({
          label: `${formatearFecha(inicio2)} - ${formatearFecha(fin2)}`,
          fechaInicio: inicio2.toISOString().split("T")[0],
          fechaFin: fin2.toISOString().split("T")[0],
          valor: `${inicio2.toISOString().split("T")[0]}_${
            fin2.toISOString().split("T")[0]
          }`,
        });
      }
    }

    // Ordenar por fechaInicio (YYYY-MM-DD) descendente
    intervalos.sort((a: any, b: any) =>
      a.fechaInicio < b.fechaInicio ? 1 : a.fechaInicio > b.fechaInicio ? -1 : 0
    );
    return intervalos;
  }, []);

  const intervalosDisponibles = React.useMemo(
    () => generarIntervalosFechas(),
    [generarIntervalosFechas]
  );

  const [intervaloSeleccionado, setIntervaloSeleccionado] =
    React.useState<string>("");

  // Rango de fechas
  const [fechaInicio, setFechaInicio] = React.useState<string>("");
  const [fechaFin, setFechaFin] = React.useState<string>("");

  // Auto-seleccionar el período más reciente por defecto para disparar la carga
  React.useEffect(() => {
    if (!intervaloSeleccionado && intervalosDisponibles.length > 0) {
      const primero = intervalosDisponibles[0];
      setIntervaloSeleccionado(primero.valor);
      setFechaInicio(primero.fechaInicio);
      setFechaFin(primero.fechaFin);
    }
  }, [intervalosDisponibles, intervaloSeleccionado]);

  const rangoValido =
    !!fechaInicio && !!fechaFin && new Date(fechaFin) >= new Date(fechaInicio);

  const handleIntervaloChange = (event: any) => {
    const valor = event.target.value;
    setIntervaloSeleccionado(valor);

    if (valor) {
      const [inicio, fin] = valor.split("_");
      setFechaInicio(inicio);
      setFechaFin(fin);
    } else {
      setFechaInicio("");
      setFechaFin("");
    }
  };

  // Hook de horas
  const { resumenHoras, loading, error, refetch } = useHorasTrabajo({
    empleadoId: empleado?.id || "",
    fechaInicio,
    fechaFin,
    enabled: !!empleado && rangoValido,
  });

  // Cálculos de salario y montos
  const { sueldoMensual = 0 } = (empleado as any) || {};
  const conteoDias = resumenHoras?.conteoHoras?.conteoDias;
  const periodoNomina = conteoDias?.totalPeriodo ?? 15;
  const diasLaborados = conteoDias?.diasLaborados ?? 0;
  const diasVacaciones = conteoDias?.vacaciones ?? 0;
  const diasPermisoCS = conteoDias?.permisoConSueldo ?? 0; // justificado

  const salarioQuincenal = React.useMemo(
    () => (sueldoMensual || 0) / 2,
    [sueldoMensual]
  );
  const salarioPorHora = React.useMemo(
    () => (sueldoMensual || 0) / (30 * 8),
    [sueldoMensual]
  );
  const fMon = React.useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "HNL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const montoDiasLaborados =
    (diasLaborados / (periodoNomina || 15)) * salarioQuincenal;
  const montoVacaciones =
    (diasVacaciones / (periodoNomina || 15)) * salarioQuincenal;
  const montoCubreEmpresa =
    (diasPermisoCS / (periodoNomina || 15)) * salarioQuincenal;
  // Estado editable para incapacidad cubierta por empresa (inicial por cálculo)
  const [montoIncapacidadCubreEmpresa, setMontoIncapacidadCubreEmpresa] =
    React.useState<number>(montoCubreEmpresa || 0);

  const subtotalQuincena =
    (montoDiasLaborados || 0) +
    (montoVacaciones || 0) +
    (montoIncapacidadCubreEmpresa || 0);

  // Cálculo de horas normales: días laborados × 8 horas
  const horasNormales = diasLaborados * 8;

  // Montos por horas (no incluidos en subtotal)
  const horas = resumenHoras?.conteoHoras?.cantidadHoras;
  const montoHorasNormales = horasNormales * salarioPorHora;
  const montoHoras25 = (horas?.p25 || 0) * salarioPorHora * 1.25;
  const montoHoras50 = (horas?.p50 || 0) * salarioPorHora * 1.5;
  const montoHoras75 = (horas?.p75 || 0) * salarioPorHora * 1.75;
  const montoHoras100 = (horas?.p100 || 0) * salarioPorHora * 2.0;

  // Constantes y estados de deducciones/ajustes
  const TECHO_IHSS = 11903; // techo IHSS
  const DEDUCCION_IHSS_FIJA = 595.16; // IHSS fijo segunda quincena
  const [ajuste, setAjuste] = React.useState<number>(0);
  const [montoExcedenteIHSS, setMontoExcedenteIHSS] = React.useState<number>(0);
  const [deduccionIHSS, setDeduccionIHSS] = React.useState<number>(0);
  const [deduccionRAP, setDeduccionRAP] = React.useState<number>(0);
  const [deduccionISR, setDeduccionISR] = React.useState<number>(0);
  const [deduccionAlimentacion, setDeduccionAlimentacion] =
    React.useState<number>(0);
  const [cobroPrestamo, setCobroPrestamo] = React.useState<number>(0);
  const [impuestoVecinal, setImpuestoVecinal] = React.useState<number>(0);
  const [otros, setOtros] = React.useState<number>(0);

  // Estados string para UI (permiten estados intermedios como "0." o "15.")
  const [inputMontoIncapacidadEmpresa, setInputMontoIncapacidadEmpresa] =
    React.useState<string>("");
  const [inputAjuste, setInputAjuste] = React.useState<string>("");
  const [inputDeduccionIHSS, setInputDeduccionIHSS] =
    React.useState<string>("");
  const [inputDeduccionISR, setInputDeduccionISR] = React.useState<string>("");
  const [inputDeduccionRAP, setInputDeduccionRAP] = React.useState<string>("");
  const [inputDeduccionAlimentacion, setInputDeduccionAlimentacion] =
    React.useState<string>("");
  const [inputCobroPrestamo, setInputCobroPrestamo] =
    React.useState<string>("");
  const [inputImpuestoVecinal, setInputImpuestoVecinal] =
    React.useState<string>("");
  const [inputOtros, setInputOtros] = React.useState<string>("");
  const [inputMontoExcedenteIHSS, setInputMontoExcedenteIHSS] =
    React.useState<string>("");

  // Cálculos de totales según indicaciones
  const totalPercepciones =
    (subtotalQuincena || 0) +
    (montoExcedenteIHSS || 0) +
    (montoHoras25 || 0) +
    (montoHoras50 || 0) +
    (montoHoras75 || 0) +
    (montoHoras100 || 0) +
    (ajuste || 0);

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

  // Asunción: 1.5% (0.015) del excedente sobre techo IHSS
  const deduccionRAPBase =
    Math.max(0, (sueldoMensual || 0) - TECHO_IHSS) * 0.015;

  // Defaults dependientes de quincena (editables por el usuario)
  // Se ejecutan cuando cambian las fechas para calcular IHSS y RAP automáticamente
  React.useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    const valorIHSS = isPrimeraQuincena ? 0 : DEDUCCION_IHSS_FIJA;
    const redondeado = roundTo2Decimals(valorIHSS);
    setDeduccionIHSS(redondeado);
    setInputDeduccionIHSS(redondeado > 0 ? String(redondeado) : "");
  }, [isPrimeraQuincena, fechaInicio, fechaFin]);

  React.useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    const valorRAP = isPrimeraQuincena ? 0 : deduccionRAPBase;
    const redondeado = roundTo2Decimals(valorRAP);
    setDeduccionRAP(redondeado);
    setInputDeduccionRAP(redondeado > 0 ? String(redondeado) : "");
  }, [isPrimeraQuincena, deduccionRAPBase, fechaInicio, fechaFin]);

  // Sincronizar montoIncapacidadCubreEmpresa con su input string
  React.useEffect(() => {
    setInputMontoIncapacidadEmpresa(
      montoIncapacidadCubreEmpresa > 0
        ? String(montoIncapacidadCubreEmpresa)
        : ""
    );
  }, [montoIncapacidadCubreEmpresa]);

  const totalDeducciones =
    (deduccionIHSS || 0) +
    (deduccionISR || 0) +
    (deduccionRAP || 0) +
    (deduccionAlimentacion || 0) +
    (cobroPrestamo || 0) +
    (impuestoVecinal || 0) +
    (otros || 0);

  const totalNetoPagar = (totalPercepciones || 0) - (totalDeducciones || 0);

  // Toast (MUI Snackbar)
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");
  const [toastSeverity, setToastSeverity] = React.useState<
    "success" | "error" | "info" | "warning"
  >("info");
  const showToast = React.useCallback(
    (
      message: string,
      severity: "success" | "error" | "info" | "warning" = "info"
    ) => {
      setToastMessage(message);
      setToastSeverity(severity);
      setToastOpen(true);
    },
    []
  );
  const handleToastClose = React.useCallback(() => setToastOpen(false), []);

  // Generar nombre de nómina segun período seleccionado
  const getNombrePeriodoNomina = React.useCallback(
    (iniISO: string, finISO: string) => {
      const meses = [
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
      ];
      const ini = new Date(iniISO + (iniISO.length === 10 ? "T00:00:00" : ""));
      const fin = new Date(finISO + (finISO.length === 10 ? "T00:00:00" : ""));
      // Reglas:
      // - Intervalo 27..11 → "Primera quincena de <mes fin> de <año fin>"
      // - Intervalo 12..26 → "Segunda quincena de <mes fin> de <año fin>"
      const diaFin = fin.getDate();
      const mesFin = meses[fin.getMonth()];
      const añoFin = fin.getFullYear();
      if (diaFin === 11) return `Primera quincena de ${mesFin} de ${añoFin}`;
      if (diaFin === 26) return `Segunda quincena de ${mesFin} de ${añoFin}`;
      // fallback: deducir por día inicio
      const diaIni = ini.getDate();
      if (diaIni === 27) return `Primera quincena de ${mesFin} de ${añoFin}`;
      if (diaIni === 12) return `Segunda quincena de ${mesFin} de ${añoFin}`;
      // si no coincide, usar mes/año de fin
      return `Quincena de ${mesFin} de ${añoFin}`;
    },
    []
  );

  const nombrePeriodoNomina = React.useMemo(
    () =>
      fechaInicio && fechaFin
        ? getNombrePeriodoNomina(fechaInicio, fechaFin)
        : "",
    [fechaInicio, fechaFin, getNombrePeriodoNomina]
  );

  // Resetear inputs al cambiar período (excepto IHSS y RAP que se manejan por separado)
  React.useEffect(() => {
    setAjuste(0);
    setMontoIncapacidadCubreEmpresa(0);
    setMontoExcedenteIHSS(0);
    setDeduccionISR(0);
    setDeduccionAlimentacion(0);
    setCobroPrestamo(0);
    setImpuestoVecinal(0);
    setOtros(0);
    // Resetear también los inputs string (excepto IHSS y RAP)
    setInputAjuste("");
    setInputMontoIncapacidadEmpresa("");
    setInputMontoExcedenteIHSS("");
    setInputDeduccionISR("");
    setInputDeduccionAlimentacion("");
    setInputCobroPrestamo("");
    setInputImpuestoVecinal("");
    setInputOtros("");
  }, [fechaInicio, fechaFin]);

  React.useEffect(() => {
    if (isPrimeraQuincena) {
      setDeduccionISR(0);
      setDeduccionAlimentacion(0);
      setCobroPrestamo(0);
      setImpuestoVecinal(0);
      setOtros(0);
    }
  }, [isPrimeraQuincena]);

  // Crear nómina
  // Bloqueo por errores de validación (no se puede procesar la nómina)
  const bloqueaPorValidacion = Boolean(
    (error as any)?.response?.data?.validationErrors
  );

  const crearNominaDisabled =
    !empleado ||
    !rangoValido ||
    loading ||
    !resumenHoras ||
    bloqueaPorValidacion;

  const handleGenerarNomina = React.useCallback(async () => {
    try {
      if (!empleado?.id) {
        showToast("No hay empleado seleccionado", "warning");
        return;
      }
      if (!rangoValido) {
        showToast("Selecciona un período de nómina válido", "warning");
        return;
      }
      if (bloqueaPorValidacion) {
        showToast(
          "No se puede procesar la nómina. Corrige las incidencias.",
          "error"
        );
        return;
      }

      // Validar traslape/duplicado: consultar nóminas existentes del empleado
      const existentes = await NominaService.list({
        empleadoId: Number(empleado.id),
      });
      const toDate = (s: string) =>
        new Date(s + (s.length === 10 ? "T00:00:00" : ""));
      const startNew = toDate(fechaInicio);
      const endNew = toDate(fechaFin);
      const overlapped = existentes.some((n) => {
        const s = toDate(n.fechaInicio as any);
        const e = toDate(n.fechaFin as any);
        return s <= endNew && startNew <= e;
      });
      if (overlapped) {
        showToast(
          "Ya existe una nómina que traslapa con el período seleccionado",
          "error"
        );
        return;
      }

      const payload: CrearNominaDto = {
        empleadoId: Number(empleado.id),
        nombrePeriodoNomina: getNombrePeriodoNomina(fechaInicio, fechaFin),
        fechaInicio,
        fechaFin,
        sueldoMensual: Number(empleado.sueldoMensual || 0),

        diasLaborados: diasLaborados || 0,
        diasVacaciones: diasVacaciones || 0,
        // Se reemplaza díasIncapacidad por montos detallados
        diasIncapacidad: 0,

        subtotalQuincena: subtotalQuincena || 0,
        montoVacaciones: montoVacaciones || 0,
        montoDiasLaborados: montoDiasLaborados || 0,
        montoExcedenteIHSS: montoExcedenteIHSS || 0,
        montoIncapacidadCubreEmpresa:
          montoIncapacidadCubreEmpresa || montoCubreEmpresa || 0,
        // Enviar incapacidad IHSS como parte de deducciones u otros si aplica en el futuro

        // Horas extra (montos)
        // Normal no se guarda como campo separado en backend; se refleja en montos de días
        montoHoras25: montoHoras25 || 0,
        montoHoras50: montoHoras50 || 0,
        montoHoras75: montoHoras75 || 0,
        montoHoras100: montoHoras100 || 0,

        // Ajustes y totales
        ajuste: ajuste || 0,
        totalPercepciones: totalPercepciones || 0,
        deduccionIHSS: deduccionIHSS || 0,
        deduccionISR: deduccionISR || 0,
        deduccionRAP: deduccionRAP || 0,
        deduccionAlimentacion: deduccionAlimentacion || 0,
        cobroPrestamo: cobroPrestamo || 0,
        impuestoVecinal: impuestoVecinal || 0,
        otros: otros || 0,
        totalDeducciones: totalDeducciones || 0,
        totalNetoPagar: totalNetoPagar || 0,
      };

      const creada = await NominaService.create(payload);
      showToast(`Nómina creada (ID ${creada.id})`, "success");
    } catch (err: any) {
      console.error("Error al crear nómina:", err);
      const apiMsg = err?.response?.data?.message;
      showToast(apiMsg || err?.message || "Error al crear nómina", "error");
    }
  }, [
    empleado?.id,
    empleado?.sueldoMensual,
    rangoValido,
    fechaInicio,
    fechaFin,
    diasLaborados,
    diasVacaciones,
    subtotalQuincena,
    montoVacaciones,
    montoDiasLaborados,
    montoCubreEmpresa,
    montoHoras25,
    montoHoras50,
    montoHoras75,
    montoHoras100,
    showToast,
    bloqueaPorValidacion,
  ]);

  // Auto-refetch al cambiar empleado si ya hay rango
  React.useEffect(() => {
    if (empleado && rangoValido) {
      if (DEBUG)
        console.debug(
          "[NominasDashboard] empleado cambió → refetch",
          empleado.id
        );
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleado?.id, rangoValido]);

  // Utils
  const eq = (a: any, b: any) =>
    a != null && b != null && String(a) === String(b);

  const splitNombre = (nombreCompleto?: string) => {
    const parts = (nombreCompleto || "").trim().split(/\s+/);
    const nombre = parts[0] || "";
    const apellido = parts.slice(1).join(" ");
    return { nombre, apellido };
  };

  // Índice actual robusto
  const getCurrentIdx = React.useCallback(() => {
    if (DEBUG) {
      console.debug("[NominasDashboard] getCurrentIdx llamado", {
        empleadoId: empleado?.id,
        empleadoCodigo: (empleado as any)?.codigo,
        empleadosIndexLength: empleadosIndex?.length,
        empleadosIndex: empleadosIndex,
      });
    }

    if (!empleado || !empleadosIndex?.length) return -1;

    let i = empleadosIndex.findIndex((x) => eq(x.id, (empleado as any).id));
    if (DEBUG)
      console.debug("[NominasDashboard] búsqueda por ID:", {
        i,
        empleadoId: empleado.id,
      });
    if (i >= 0) return i;

    if ((empleado as any).codigo) {
      i = empleadosIndex.findIndex((x) =>
        x.codigo ? eq(x.codigo, (empleado as any).codigo) : false
      );
      if (DEBUG)
        console.debug("[NominasDashboard] búsqueda por código:", {
          i,
          empleadoCodigo: (empleado as any).codigo,
        });
      if (i >= 0) return i;
    }

    const nombreCompletoActual = `${empleado.nombre ?? ""} ${
      empleado.apellido ?? ""
    }`.trim();
    i = empleadosIndex.findIndex(
      (x) => (x.nombreCompleto || "").trim() === nombreCompletoActual
    );
    if (DEBUG)
      console.debug("[NominasDashboard] búsqueda por nombre:", {
        i,
        nombreCompletoActual,
      });

    return i;
  }, [empleado, empleadosIndex]);

  const idx = getCurrentIdx();
  const hayPrev = idx > 0;
  const hayNext = idx >= 0 && idx < empleadosIndex.length - 1;

  // 🔧 Alineación automática si llega índice pero el actual no está
  React.useEffect(() => {
    if (!empleado || !empleadosIndex.length) return;
    if (idx !== -1) return;

    if ((empleado as any).codigo) {
      const j = empleadosIndex.findIndex(
        (x) => x.codigo && eq(x.codigo, (empleado as any).codigo)
      );
      if (j >= 0) {
        const target = empleadosIndex[j];
        const { nombre, apellido } = splitNombre(target.nombreCompleto);
        if (DEBUG)
          console.debug("[NominasDashboard] realineado por código →", target);
        setEmpleado(
          (prevEmp) =>
            ({
              ...(prevEmp ?? ({} as any)),
              id: target.id as any,
              codigo: target.codigo ?? (prevEmp as any)?.codigo ?? null,
              nombre,
              apellido,
            } as Empleado)
        );
        return;
      }
    }

    const first = empleadosIndex[0];
    const { nombre, apellido } = splitNombre(first.nombreCompleto);
    if (DEBUG)
      console.debug(
        "[NominasDashboard] realineado al primero del índice →",
        first
      );
    setEmpleado(
      (prevEmp) =>
        ({
          ...(prevEmp ?? ({} as any)),
          id: first.id as any,
          codigo: first.codigo ?? (prevEmp as any)?.codigo ?? null,
          nombre,
          apellido,
        } as Empleado)
    );
  }, [idx, empleado, empleadosIndex]);

  React.useEffect(() => {
    if (DEBUG) {
      const prevDisabled = !(empleadosIndex?.length ? hayPrev : hasPrevious);
      const nextDisabled = !(empleadosIndex?.length ? hayNext : hasNext);
      console.debug("[NominasDashboard] estado navegación", {
        empleadosIndexLen: empleadosIndex.length,
        empleadoId: empleado?.id,
        idx,
        hayPrev,
        hayNext,
        prevDisabled,
        nextDisabled,
        empleadosIndex: empleadosIndex,
        empleado: empleado,
      });
    }
  }, [
    empleadosIndex.length,
    empleado?.id,
    idx,
    hayPrev,
    hayNext,
    hasPrevious,
    hasNext,
    empleadosIndex,
    empleado,
  ]);

  // Función para cargar empleado completo por ID
  const cargarEmpleadoCompleto = React.useCallback(
    async (empleadoId: number) => {
      try {
        if (DEBUG)
          console.debug(
            "[NominasDashboard] Cargando empleado completo:",
            empleadoId
          );
        const empleadoCompleto = await EmpleadoService.getById(empleadoId);
        setEmpleado(empleadoCompleto);
        if (DEBUG)
          console.debug(
            "[NominasDashboard] Empleado cargado:",
            empleadoCompleto
          );
      } catch (error) {
        console.error("[NominasDashboard] Error al cargar empleado:", error);
        const empleadoIndex = empleadosIndex.find((e) => e.id === empleadoId);
        if (empleadoIndex) {
          const { nombre, apellido } = splitNombre(
            empleadoIndex.nombreCompleto
          );
          setEmpleado(
            (prev) =>
              ({
                ...prev,
                id: empleadoIndex.id as any,
                codigo: empleadoIndex.codigo,
                nombre,
                apellido,
              } as Empleado)
          );
        }
      }
    },
    [empleadosIndex]
  );

  const goPrev = () => {
    if (DEBUG) {
      console.debug("[NominasDashboard] goPrev llamado", {
        empleadosIndexLength: empleadosIndex?.length,
        hayPrev,
        idx,
        empleadoId: empleado?.id,
      });
    }

    if (empleadosIndex?.length && hayPrev) {
      const prev = empleadosIndex[idx - 1];
      if (DEBUG) console.debug("[NominasDashboard] goPrev ->", prev);
      cargarEmpleadoCompleto(prev.id);
    } else if (onPrevious) {
      if (DEBUG) console.debug("[NominasDashboard] goPrev -> onPrevious()");
      onPrevious();
    } else if (DEBUG) {
      console.debug("[NominasDashboard] goPrev disabled");
    }
  };

  const goNext = () => {
    if (DEBUG) {
      console.debug("[NominasDashboard] goNext llamado", {
        empleadosIndexLength: empleadosIndex?.length,
        hayNext,
        idx,
        empleadoId: empleado?.id,
      });
    }

    if (empleadosIndex?.length && hayNext) {
      const next = empleadosIndex[idx + 1];
      if (DEBUG) console.debug("[NominasDashboard] goNext ->", next);
      cargarEmpleadoCompleto(next.id);
    } else if (onNext) {
      if (DEBUG) console.debug("[NominasDashboard] goNext -> onNext()");
      onNext();
    } else if (DEBUG) {
      console.debug("[NominasDashboard] goNext disabled");
    }
  };

  // Asegurar datos completos del colaborador (contacto/banco/salario)
  const fullLoadedRef = React.useRef<Set<number>>(new Set());
  React.useEffect(() => {
    if (!empleado || !empleado.id) return;
    const id = empleado.id as number;
    const needsFull =
      empleado.sueldoMensual == null ||
      empleado.banco == null ||
      empleado.tipoCuenta == null ||
      empleado.numeroCuenta == null ||
      empleado.correoElectronico == null ||
      empleado.telefono == null ||
      empleado.direccion == null;
    if (needsFull && !fullLoadedRef.current.has(id)) {
      cargarEmpleadoCompleto(id);
      fullLoadedRef.current.add(id);
    }
  }, [empleado, cargarEmpleadoCompleto]);

  // Guard
  if (!empleado) {
    return (
      <Container maxWidth="md" sx={{ height: "100%", overflowY: "auto" }}>
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            No hay colaborador seleccionado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona un colaborador desde la gestión de colaboradores para ver
            su nómina.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/rrhh/colaboradores")}
          >
            Ir a Gestión de Colaboradores
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ py: 4 }}>
        <Snackbar
          open={toastOpen}
          autoHideDuration={4000}
          onClose={handleToastClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleToastClose}
            severity={toastSeverity}
            sx={{ width: "100%" }}
          >
            {toastMessage}
          </Alert>
        </Snackbar>
        {/* Encabezado con info + nav */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
            color: "white",
            position: "relative", // <-- necesario para botón flotante
          }}
        >
          {/* Botón VOLVER flotante (75% tamaño) */}
          <IconButton
            onClick={goBackToList}
            title="Volver a lista de colaboradores"
            aria-label="Volver"
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              width: 30, // 75% de 40
              height: 30, // 75% de 40
              zIndex: 2,
              color: "white",
              backgroundColor: "rgba(0,0,0,0.2)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.32)" },
              boxShadow: 1,
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} /> {/* 75% de 20 */}
          </IconButton>

          <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
            {/* Prev */}
            <IconButton
              onClick={goPrev}
              disabled={!(empleadosIndex?.length ? hayPrev : hasPrevious)}
              sx={{
                color: "white",
                opacity: (empleadosIndex?.length ? hayPrev : hasPrevious)
                  ? 1
                  : 0.5,
                width: 20,
                height: 48,
                "& .MuiSvgIcon-root": { fontSize: 80 },
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
              title={`Anterior${
                empleadosIndex?.length
                  ? ` (${idx + 1}/${empleadosIndex.length})`
                  : ""
              }`}
            >
              <NavigateBeforeIcon />
            </IconButton>

            {/* Avatar + datos (25% más grande) */}
            <Box
              sx={{
                display: "flex",
                gap: 3,
                alignItems: "center",
                flex: 2,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <Avatar
                src={empleado.urlFotoPerfil || undefined}
                alt={`${empleado.nombre} ${empleado.apellido}`}
                sx={{ width: 100, height: 100, border: "3px solid white" }}
              >
                {empleado.nombre?.[0]}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {empleado.nombre} {empleado.apellido}
                </Typography>
                {empleado.cargo && (
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: "1rem", sm: "1.125rem" },
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {empleado.cargo}
                  </Typography>
                )}
                <Typography variant="subtitle1">
                  {empleado.codigo || "Sin código asignado"}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1.5,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 2,
              }}
            >
              <FormControl size="small" sx={{ minWidth: 300 }}>
                <InputLabel
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.875rem",
                  }}
                >
                  Período de Nómina
                </InputLabel>
                <Select
                  value={intervaloSeleccionado}
                  onChange={handleIntervaloChange}
                  label="Período de Nómina"
                  size="small"
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.3)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                    "& .MuiSelect-icon": { color: "white" },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { maxHeight: 300 },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Selecciona un período</em>
                  </MenuItem>
                  {intervalosDisponibles.map((intervalo) => (
                    <MenuItem key={intervalo.valor} value={intervalo.valor}>
                      {intervalo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                disabled={!rangoValido || !empleado}
                onClick={() => refetch()}
                sx={{ ml: 1 }}
              >
                Aplicar
              </Button>
            </Box>

            {/* Next */}
            <IconButton
              onClick={goNext}
              disabled={!(empleadosIndex?.length ? hayNext : hasNext)}
              sx={{
                color: "white",
                opacity: (empleadosIndex?.length ? hayNext : hasNext) ? 1 : 0.5,
                width: 20,
                height: 48,
                "& .MuiSvgIcon-root": { fontSize: 80 },
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
              title={`Siguiente${
                empleadosIndex?.length
                  ? ` (${idx + 1}/${empleadosIndex.length})`
                  : ""
              }`}
            >
              <NavigateNextIcon />
            </IconButton>
          </Box>

          {/* Indicador de navegación */}
          {empleadosIndex?.length > 0 && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Navegación:{" "}
                {idx >= 0
                  ? `${idx + 1} de ${empleadosIndex.length}`
                  : "No encontrado"}{" "}
                colaboradores
              </Typography>
            </Box>
          )}

          {!intervaloSeleccionado && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                💡 Los períodos de nómina se calculan automáticamente en
                intervalos de ~15 días
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {/* Check if it's a validation error with specific dates */}
            {error.response?.data?.validationErrors ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  No se puede procesar la nómina
                </Typography>
                {error.response.data.validationErrors.fechasNoAprobadas
                  ?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="error" gutterBottom>
                      📋 Fechas no aprobadas por supervisor:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {error.response.data.validationErrors.fechasNoAprobadas.map(
                        (fecha: string) => (
                          <Typography
                            key={fecha}
                            variant="body2"
                            sx={{
                              backgroundColor: "error.light",
                              color: "error.contrastText",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: "0.875rem",
                            }}
                          >
                            {new Date(fecha + "T00:00:00").toLocaleDateString(
                              "es-HN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}
                          </Typography>
                        )
                      )}
                    </Box>
                  </Box>
                )}
                {error.response.data.validationErrors.fechasSinRegistro
                  ?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="error" gutterBottom>
                      📝 Fechas sin registro diario:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {error.response.data.validationErrors.fechasSinRegistro.map(
                        (fecha: string) => (
                          <Typography
                            key={fecha}
                            variant="body2"
                            sx={{
                              backgroundColor: "warning.light",
                              color: "warning.contrastText",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: "0.875rem",
                            }}
                          >
                            {new Date(fecha + "T00:00:00").toLocaleDateString(
                              "es-HN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}
                          </Typography>
                        )
                      )}
                    </Box>
                  </Box>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  💡 Contacte al supervisor para aprobar los registros
                  pendientes o complete los registros faltantes.
                </Typography>
              </Box>
            ) : (
              // Regular error message
              error.response?.data?.message ||
              (error.response?.status === 404
                ? "No se pudo conectar con el servidor"
                : "Error al cargar los datos")
            )}
            <Button size="small" onClick={refetch} sx={{ ml: 2 }}>
              Reintentar
            </Button>
          </Alert>
        )}

        {/* Tarjetas informativas */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Información Laboral
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Departamento:</strong>{" "}
                  {(empleado as any).departamento?.nombre ||
                  (typeof (empleado as any).departamento === "string"
                    ? (empleado as any).departamento
                    : null) ||
                  (empleado as any).departamentoId
                    ? `Departamento ${(empleado as any).departamentoId}`
                    : "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Contrato:</strong>{" "}
                  {empleado.tipoContrato ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Horario:</strong>{" "}
                  {empleado.tipoHorario ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Sueldo Mensual:</strong>{" "}
                  {fMon.format(empleado.sueldoMensual ?? 0) ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Sueldo Quincenal:</strong>{" "}
                  {empleado?.sueldoMensual != null
                    ? fMon.format(empleado.sueldoMensual / 2)
                    : "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Sueldo por hora:</strong>{" "}
                  {Number.isFinite(Number(empleado?.sueldoMensual))
                    ? fMon.format(Number(empleado!.sueldoMensual) / 240)
                    : "—"}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Información Bancaria
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Banco:</strong> {empleado.banco || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Cuenta:</strong>{" "}
                  {empleado.tipoCuenta || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Número de Cuenta:</strong>{" "}
                  {empleado.numeroCuenta || "No especificado"}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Información de Contacto
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Correo:</strong>{" "}
                  {empleado.correoElectronico || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Teléfono:</strong>{" "}
                  {empleado.telefono || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Dirección:</strong>{" "}
                  {empleado.direccion || "No especificada"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Información de días */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Registro de Incidencias
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : resumenHoras ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 3,
                  mt: 2,
                }}
              >
                {/* Columna 1 */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Días laborados:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {resumenHoras.conteoHoras.conteoDias?.diasLaborados ?? 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Vacaciones (días):</strong>
                    </Typography>
                    <Typography variant="body1">
                      {resumenHoras.conteoHoras.conteoDias?.vacaciones ?? 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Total días nómina:</strong>
                    </Typography>
                    <Typography variant="body1">{periodoNomina}</Typography>
                  </Box>
                </Box>

                {/* Columna 2 */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Monto días laborados:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {fMon.format(montoDiasLaborados || 0)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Monto vacaciones:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {fMon.format(montoVacaciones || 0)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Monto cubre empresa:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {fMon.format(montoCubreEmpresa || 0)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Subtotal:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {fMon.format(subtotalQuincena || 0)}
                    </Typography>
                  </Box>
                </Box>

                {/* Columna 3 */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Permisos justificados:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {resumenHoras.conteoHoras.conteoDias?.permisoConSueldo ??
                        0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Permisos no justificados:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {resumenHoras.conteoHoras.conteoDias?.permisoSinSueldo ??
                        0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Inasistencias:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {resumenHoras.conteoHoras.conteoDias?.inasistencias ?? 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Selecciona un período de nómina del selector y presiona
                "Aplicar" para ver la información.
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Registro de incidencias */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Horas Extras
          </Typography>
          <DesgloseIncidenciasComponent
            desglose={resumenHoras?.desgloseIncidencias || null}
            loading={loading}
            extrasMontos={{
              normal: montoHorasNormales,
              p25: montoHoras25,
              p50: montoHoras50,
              p75: montoHoras75,
              p100: montoHoras100,
            }}
            currencyFormatter={(n: number) => fMon.format(n || 0)}
            horasNormales={horasNormales}
          />
        </Box>

        {/* Deducciones (placeholder) */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Ajuste y Deducciones
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            {nombrePeriodoNomina && (
              <Typography
                variant="h6"
                color="primary"
                sx={{ mb: 2, fontWeight: 700 }}
              >
                {nombrePeriodoNomina}
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              {/* COLUMNA IZQUIERDA: 3 PERCEPCIONES + IHSS + RAP */}
              <TextField
                label="(+) Monto Incapacidad (Empresa)"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputMontoIncapacidadEmpresa}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputMontoIncapacidadEmpresa(sanitized);
                  setMontoIncapacidadCubreEmpresa(parseDecimalValue(sanitized));
                }}
              />
              {/* COLUMNA DERECHA: DEDUCCIONES RESTANTES */}
              <TextField
                label="(-) Deducción ISR"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputDeduccionISR}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputDeduccionISR(sanitized);
                  setDeduccionISR(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(+) Monto Incapacidad (IHSS)"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputMontoExcedenteIHSS}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputMontoExcedenteIHSS(sanitized);
                  setMontoExcedenteIHSS(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(-) Deducción Alimentación"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputDeduccionAlimentacion}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputDeduccionAlimentacion(sanitized);
                  setDeduccionAlimentacion(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(+) Ajuste"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputAjuste}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputAjuste(sanitized);
                  setAjuste(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(-) Cobro Préstamo"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputCobroPrestamo}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputCobroPrestamo(sanitized);
                  setCobroPrestamo(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(-) Deducción IHSS"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputDeduccionIHSS}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputDeduccionIHSS(sanitized);
                  setDeduccionIHSS(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(-) Impuesto Vecinal"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputImpuestoVecinal}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputImpuestoVecinal(sanitized);
                  setImpuestoVecinal(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label={`(-) Deducción RAP (1.5% excedente sobre ${fMon.format(
                  TECHO_IHSS
                )})`}
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputDeduccionRAP}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputDeduccionRAP(sanitized);
                  setDeduccionRAP(parseDecimalValue(sanitized));
                }}
              />
              <TextField
                label="(-) Otros"
                type="text"
                inputMode="decimal"
                size="small"
                placeholder="0"
                value={inputOtros}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value);
                  setInputOtros(sanitized);
                  setOtros(parseDecimalValue(sanitized));
                }}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1">
                  <strong>Total Percepciones:</strong>
                </Typography>
                <Typography variant="body1">
                  {fMon.format(totalPercepciones)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between" }}
              ></Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1">
                  <strong>Total Deducciones:</strong>
                </Typography>
                <Typography variant="body1">
                  {fMon.format(totalDeducciones)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1">
                  <strong>Total Neto a Pagar:</strong>
                </Typography>
                <Typography variant="body1">
                  {fMon.format(totalNetoPagar)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Button
                variant="contained"
                color="primary"
                disabled={crearNominaDisabled}
                onClick={handleGenerarNomina}
              >
                Generar Nómina
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default NominasDashboard;
