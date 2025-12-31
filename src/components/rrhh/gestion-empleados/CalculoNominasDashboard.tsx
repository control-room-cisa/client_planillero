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
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Fade,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import {
  useNavigate,
  useOutletContext,
  useLocation,
  useParams,
} from "react-router-dom";
import type { Empleado } from "../../../services/empleadoService";
import type { EmpleadoIndexItem, LayoutOutletCtx } from "../../Layout";
import { getImageUrl } from "../../../utils/imageUtils";
import { useHorasTrabajo } from "../../../hooks/useHorasTrabajo";
import DesgloseIncidenciasComponent from "./DesgloseIncidencias";
import EmpleadoService from "../../../services/empleadoService";
import NominaService, {
  type CrearNominaDto,
} from "../../../services/nominaService";
import CalculoHorasTrabajoService from "../../../services/calculoHorasTrabajoService";
import DetalleRegistrosDiariosModal from "./detalleRegistrosDiariosModal";
import type { DeduccionAlimentacionDetalleDto } from "../../../dtos/calculoHorasTrabajoDto";

interface CalculoNominasProps {
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

const CalculoNominas: React.FC<CalculoNominasProps> = ({
  empleado: empleadoProp,
  empleadosIndex: empleadosIndexProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { codigoEmpleado } = useParams<{ codigoEmpleado?: string }>();
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

  // Sincronizar empleado cuando cambia empleadoProp
  React.useEffect(() => {
    if (empleadoProp) {
      // Verificar si el empleado realmente cambió para evitar actualizaciones innecesarias
      const empleadoActualCodigo = (empleado as any)?.codigo;
      const nuevoEmpleadoCodigo = (empleadoProp as any)?.codigo;

      if (
        empleadoActualCodigo !== nuevoEmpleadoCodigo ||
        empleado?.id !== empleadoProp.id
      ) {
        if (DEBUG) {
          console.debug(
            "[CalculoNominas] empleadoProp cambió, actualizando estado",
            {
              empleadoIdAnterior: empleado?.id,
              empleadoIdNuevo: empleadoProp.id,
              codigoEmpleadoAnterior: empleadoActualCodigo,
              codigoEmpleadoNuevo: nuevoEmpleadoCodigo,
              codigoEmpleadoUrl: codigoEmpleado,
            }
          );
        }
        setEmpleado(empleadoProp);
      }
    }
  }, [empleadoProp?.id, (empleadoProp as any)?.codigo]); // Solo dependencias del empleadoProp, no del estado interno

  React.useEffect(() => {
    if (DEBUG) {
      console.debug("[CalculoNominas] mount", {
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
    const valoresUnicos = new Set<string>(); // Para evitar duplicados
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

      // Solo agregar período 1 si su fecha de inicio no es futura y no está duplicado
      if (inicio1 <= hoyNormalizado) {
        const valor1 = `${inicio1.toISOString().split("T")[0]}_${
          fin1.toISOString().split("T")[0]
        }`;
        if (!valoresUnicos.has(valor1)) {
          valoresUnicos.add(valor1);
          intervalos.push({
            label: `${formatearFecha(inicio1)} - ${formatearFecha(fin1)}`,
            fechaInicio: inicio1.toISOString().split("T")[0],
            fechaFin: fin1.toISOString().split("T")[0],
            valor: valor1,
          });
        }
      }

      // Solo agregar período 2 si su fecha de inicio no es futura y no está duplicado
      if (inicio2 <= hoyNormalizado) {
        const valor2 = `${inicio2.toISOString().split("T")[0]}_${
          fin2.toISOString().split("T")[0]
        }`;
        if (!valoresUnicos.has(valor2)) {
          valoresUnicos.add(valor2);
          intervalos.push({
            label: `${formatearFecha(inicio2)} - ${formatearFecha(fin2)}`,
            fechaInicio: inicio2.toISOString().split("T")[0],
            fechaFin: fin2.toISOString().split("T")[0],
            valor: valor2,
          });
        }
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
  const diasVacaciones = conteoDias?.vacaciones ?? 0;
  const diasPermisoCS = conteoDias?.permisoConSueldo ?? 0; // justificado

  // Incapacidades (nombres correctos del backend)
  const diasIncapacidadCubreEmpresa =
    conteoDias?.incapacidadEmpresa ??
    conteoDias?.incapacidadCubreEmpresaDias ??
    0;
  const diasIncapacidadCubreIHSS =
    conteoDias?.incapacidadIHSS ?? conteoDias?.incapacidadCubreIHSSDias ?? 0;

  // Días laborados: el backend ya resta incapacidades, vacaciones, permisos, etc.
  // Pero recalculamos aquí para asegurar consistencia con los datos mostrados
  const diasLaborados = Math.max(
    0,
    (periodoNomina || 15) -
      (diasVacaciones || 0) -
      (diasPermisoCS || 0) -
      (diasIncapacidadCubreEmpresa || 0) -
      (diasIncapacidadCubreIHSS || 0) -
      ((conteoDias?.permisoSinSueldo ?? 0) || 0) -
      ((conteoDias?.inasistencias ?? 0) || 0)
  );

  const salarioQuincenal = React.useMemo(
    () => (sueldoMensual || 0) / 2,
    [sueldoMensual]
  );
  const salarioPorHora = React.useMemo(
    () => (sueldoMensual || 0) / (30 * 8),
    [sueldoMensual]
  );
  const formatCurrency = React.useCallback((valor: number) => {
    return `${(valor || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} L`;
  }, []);

  const montoDiasLaborados =
    (diasLaborados / (periodoNomina || 15)) * salarioQuincenal;
  const montoVacaciones =
    (diasVacaciones / (periodoNomina || 15)) * salarioQuincenal;

  // Horas de permisos justificados: usar horas del resumen si existen, si no días × 8
  const horasPermisosJustificados =
    Number(
      (resumenHoras as any)?.conteoHoras?.cantidadHoras
        ?.permisoConSueldoHoras ?? diasPermisoCS * 8
    ) || 0;
  const montoPermisosJustificados = horasPermisosJustificados * salarioPorHora;

  // Horas de incapacidades (priorizar nombres correctos del backend)
  // Comentado temporalmente - no se muestran en el dashboard por el momento
  // const horasIncapacidadCubreEmpresa =
  //   Number(
  //     resumenHoras?.conteoHoras?.cantidadHoras?.incapacidadEmpresa ??
  //       resumenHoras?.conteoHoras?.cantidadHoras
  //         ?.incapacidadCubreEmpresaHoras ??
  //       diasIncapacidadCubreEmpresa * 8
  //   ) || 0;
  // const horasIncapacidadCubreIHSS =
  //   Number(
  //     resumenHoras?.conteoHoras?.cantidadHoras?.incapacidadIHSS ??
  //       resumenHoras?.conteoHoras?.cantidadHoras?.incapacidadCubreIHSSHoras ??
  //       diasIncapacidadCubreIHSS * 8
  //   ) || 0;

  // Constantes y estados de deducciones/ajustes
  const PISO_IHSS = 11903.13; // piso IHSS para cálculo de RAP

  // Cálculo de montos de incapacidad según fórmulas especificadas
  // Monto incapacidad IHSS: diasIncapacidadIHSS * (PISO_IHSS * 0.66) / 30
  const montoIncapacidadIHSSCalculado = React.useMemo(() => {
    if (!diasIncapacidadCubreIHSS) return 0;
    return roundTo2Decimals((diasIncapacidadCubreIHSS * PISO_IHSS * 0.66) / 30);
  }, [diasIncapacidadCubreIHSS]);

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

  const subtotalQuincena =
    (montoDiasLaborados || 0) +
    (montoVacaciones || 0) +
    (montoIncapacidadCubreEmpresa || 0) +
    (montoPermisosJustificados || 0);

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
  const DEDUCCION_IHSS_FIJA = 595.16; // IHSS fijo constante
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
  const [inputDeduccionAlimentacion, setInputDeduccionAlimentacion] =
    React.useState<string>("");
  const [inputCobroPrestamo, setInputCobroPrestamo] =
    React.useState<string>("");
  const [inputImpuestoVecinal, setInputImpuestoVecinal] =
    React.useState<string>("");
  const [inputOtros, setInputOtros] = React.useState<string>("");
  const [inputMontoExcedenteIHSS, setInputMontoExcedenteIHSS] =
    React.useState<string>("");

  // Estado para error de alimentación
  const [errorAlimentacion, setErrorAlimentacion] = React.useState<{
    tieneError: boolean;
    mensajeError: string;
  } | null>(null);
  const [loadingAlimentacion, setLoadingAlimentacion] = React.useState(false);
  const [detalleDeduccionAlimentacion, setDetalleDeduccionAlimentacion] =
    React.useState<DeduccionAlimentacionDetalleDto[]>([]);
  const [modalDetalleAlimentacionOpen, setModalDetalleAlimentacionOpen] =
    React.useState(false);

  // Estado para controlar el modal de registros diarios
  const [modalRegistrosOpen, setModalRegistrosOpen] = React.useState(false);

  // Estado para verificar si ya existe una nómina con el mismo intervalo
  const [nominaExiste, setNominaExiste] = React.useState<boolean>(false);
  const [loadingNominaCheck, setLoadingNominaCheck] =
    React.useState<boolean>(false);

  // Cálculos de totales según indicaciones
  // NOTA: montoIncapacidadIHSS NO se suma al total de percepciones
  // Solo montoIncapacidadCubreEmpresa se suma en subtotalQuincena
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

  // Cálculo de RAP: 1.5% (0.015) del excedente sobre piso IHSS
  // Si Salario ≤ 11,903.13 → Base = 0
  // Si Salario > 11,903.13 → Base = (Salario - 11,903.13) * 0.015
  const deduccionRAPBase = React.useMemo(() => {
    const salario = sueldoMensual || 0;
    if (salario <= PISO_IHSS) return 0;
    return (salario - PISO_IHSS) * 0.015;
  }, [sueldoMensual]);

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
  }, [fechaInicio, fechaFin, deduccionRAPBase, codigoNominaTerminaEnA]);

  // Sincronizar montoIncapacidadCubreEmpresa con su input string
  React.useEffect(() => {
    setInputMontoIncapacidadEmpresa(
      montoIncapacidadCubreEmpresa > 0
        ? String(montoIncapacidadCubreEmpresa)
        : ""
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
      montoIncapacidadIHSS > 0 ? String(montoIncapacidadIHSS) : ""
    );
  }, [montoIncapacidadIHSS]);

  const totalDeducciones =
    (deduccionIHSS || 0) +
    (deduccionISR || 0) +
    (deduccionRAP || 0) +
    (deduccionAlimentacion || 0) +
    (cobroPrestamo || 0) +
    (impuestoVecinal || 0) +
    (otros || 0);

  const totalNetoPagar = (totalPercepciones || 0) - (totalDeducciones || 0);

  const totalDetalleAlimentacion = React.useMemo(
    () =>
      detalleDeduccionAlimentacion.reduce(
        (acum, item) => acum + (item.precio || 0),
        0
      ),
    [detalleDeduccionAlimentacion]
  );

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
    setErrorAlimentacion(null);
  }, [fechaInicio, fechaFin, codigoNominaTerminaEnA]);

  React.useEffect(() => {
    if (isPrimeraQuincena) {
      setDeduccionISR(0);
      // deduccionAlimentacion NO se resetea - se aplica en todas las quincenas (A y B)
      setCobroPrestamo(0);
      setImpuestoVecinal(0);
      // Otros NO se resetea - siempre editable
    }
  }, [isPrimeraQuincena]);

  // Cargar deducciones de alimentación directamente desde el endpoint externo
  // Alimentación se aplica siempre (tanto en A como en B)
  React.useEffect(() => {
    const cargarDeduccionAlimentacion = async () => {
      // Necesitamos el código del empleado, no el ID
      const codigoEmpleado = (empleado as any)?.codigo;
      if (!codigoEmpleado || !fechaInicio || !fechaFin || !rangoValido) {
        setDetalleDeduccionAlimentacion([]);
        setModalDetalleAlimentacionOpen(false);
        setDeduccionAlimentacion(0);
        setInputDeduccionAlimentacion("");
        if (!codigoEmpleado && empleado?.id) {
          // Si no hay código pero hay empleado, mostrar error
          setErrorAlimentacion({
            tieneError: true,
            mensajeError: "El empleado no tiene código asignado",
          });
        } else {
          setErrorAlimentacion(null);
        }
        return;
      }

      setLoadingAlimentacion(true);
      setErrorAlimentacion(null);
      setModalDetalleAlimentacionOpen(false);

      // Verificar formato de fechas (deben ser YYYY-MM-DD)
      const fechaInicioFormato = fechaInicio.match(/^\d{4}-\d{2}-\d{2}$/);
      const fechaFinFormato = fechaFin.match(/^\d{4}-\d{2}-\d{2}$/);

      console.log("[CalculoNominas] Cargando deducciones de alimentación:", {
        codigoEmpleado,
        fechaInicio,
        fechaFin,
        fechaInicioValida: !!fechaInicioFormato,
        fechaFinValida: !!fechaFinFormato,
        rangoValido,
      });

      if (!fechaInicioFormato || !fechaFinFormato) {
        setErrorAlimentacion({
          tieneError: true,
          mensajeError: `Formato de fecha inválido. Fecha inicio: ${fechaInicio}, Fecha fin: ${fechaFin}. Se espera formato YYYY-MM-DD`,
        });
        setLoadingAlimentacion(false);
        return;
      }

      try {
        // Llamar al endpoint del backend que a su vez llama a la API externa
        const t0 = Date.now();
        const resultado =
          await CalculoHorasTrabajoService.getDeduccionesAlimentacion(
            codigoEmpleado,
            fechaInicio,
            fechaFin
          );
        const tiempoTranscurrido = Date.now() - t0;
        console.log(
          `[CalculoNominas] Deducciones obtenidas en ${tiempoTranscurrido}ms:`,
          resultado
        );

        // Solo manejar el error específico de alimentación que viene en el objeto
        if (resultado.errorAlimentacion?.tieneError) {
          setErrorAlimentacion(resultado.errorAlimentacion);
          // Si hay error, establecer el campo en 0 y habilitar edición
          setDeduccionAlimentacion(0);
          setInputDeduccionAlimentacion("");
          setDetalleDeduccionAlimentacion([]);
        } else {
          // Si no hay error (success = true), usar el valor calculado (no editable)
          const valorCalculado = resultado.deduccionesAlimentacion ?? 0;
          setDeduccionAlimentacion(valorCalculado);
          setInputDeduccionAlimentacion(
            valorCalculado > 0 ? String(valorCalculado) : ""
          );
          setErrorAlimentacion(null);
          setDetalleDeduccionAlimentacion(resultado.detalle ?? []);
        }
      } catch (err: any) {
        // Error al obtener deducciones de alimentación
        setErrorAlimentacion({
          tieneError: true,
          mensajeError:
            err?.message || "Error al obtener deducciones de alimentación",
        });
        setDeduccionAlimentacion(0);
        setInputDeduccionAlimentacion("");
        setDetalleDeduccionAlimentacion([]);
      } finally {
        setLoadingAlimentacion(false);
      }
    };

    cargarDeduccionAlimentacion();
  }, [
    empleado?.id,
    (empleado as any)?.codigo,
    fechaInicio,
    fechaFin,
    rangoValido,
  ]);

  // Crear nómina
  // Bloqueo por errores de validación (no se puede procesar la nómina)
  const bloqueaPorValidacion = Boolean(
    (error as any)?.response?.data?.validationErrors
  );

  // Verificar automáticamente si existe una nómina con el mismo intervalo al cargar el período
  React.useEffect(() => {
    const verificarNominaExistente = async () => {
      if (!empleado?.id || !rangoValido || !fechaInicio || !fechaFin) {
        setNominaExiste(false);
        return;
      }

      setLoadingNominaCheck(true);
      try {
        const existentes = await NominaService.list({
          empleadoId: Number(empleado.id),
        });

        // Verificar si existe una nómina con el mismo intervalo exacto (fechaInicio y fechaFin iguales)
        const existeMismoIntervalo = existentes.some((n) => {
          const nFechaInicio =
            n.fechaInicio &&
            typeof n.fechaInicio === "object" &&
            "toISOString" in n.fechaInicio
              ? (n.fechaInicio as Date).toISOString().split("T")[0]
              : String(n.fechaInicio || "").split("T")[0];
          const nFechaFin =
            n.fechaFin &&
            typeof n.fechaFin === "object" &&
            "toISOString" in n.fechaFin
              ? (n.fechaFin as Date).toISOString().split("T")[0]
              : String(n.fechaFin || "").split("T")[0];

          return nFechaInicio === fechaInicio && nFechaFin === fechaFin;
        });

        setNominaExiste(existeMismoIntervalo);
      } catch (error) {
        console.error("Error al verificar nóminas existentes:", error);
        setNominaExiste(false);
      } finally {
        setLoadingNominaCheck(false);
      }
    };

    verificarNominaExistente();
  }, [empleado?.id, fechaInicio, fechaFin, rangoValido]);

  const crearNominaDisabled =
    !empleado ||
    !rangoValido ||
    loading ||
    !resumenHoras ||
    bloqueaPorValidacion ||
    nominaExiste; // Deshabilitar si ya existe una nómina con el mismo intervalo

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
      // El repositorio ya filtra por deletedAt: null, así que solo obtenemos nóminas activas
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
        montoIncapacidadCubreEmpresa: montoIncapacidadCubreEmpresa || 0,
        // montoIncapacidadIHSS es informativo y NO se guarda (no se suma a totales)
        montoPermisosJustificados: montoPermisosJustificados || 0,

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

        comentario: comentario || null,
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
    montoIncapacidadCubreEmpresa,
    montoIncapacidadIHSS,
    montoPermisosJustificados,
    montoHoras25,
    montoHoras50,
    montoHoras75,
    montoHoras100,
    showToast,
    bloqueaPorValidacion,
    montoExcedenteIHSS,
    ajuste,
    totalPercepciones,
    deduccionIHSS,
    deduccionISR,
    deduccionRAP,
    deduccionAlimentacion,
    cobroPrestamo,
    impuestoVecinal,
    otros,
    totalDeducciones,
    totalNetoPagar,
    comentario,
    getNombrePeriodoNomina,
  ]);

  // Auto-refetch al cambiar empleado si ya hay rango
  React.useEffect(() => {
    if (empleado && rangoValido) {
      if (DEBUG)
        console.debug(
          "[CalculoNominas] empleado cambió → refetch",
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
      console.debug("[CalculoNominas] getCurrentIdx llamado", {
        empleadoId: empleado?.id,
        empleadoCodigo: (empleado as any)?.codigo,
        empleadosIndexLength: empleadosIndex?.length,
        empleadosIndex: empleadosIndex,
      });
    }

    if (!empleado || !empleadosIndex?.length) return -1;

    let i = empleadosIndex.findIndex((x) => eq(x.id, (empleado as any).id));
    if (DEBUG)
      console.debug("[CalculoNominas] búsqueda por ID:", {
        i,
        empleadoId: empleado.id,
      });
    if (i >= 0) return i;

    if ((empleado as any).codigo) {
      i = empleadosIndex.findIndex((x) =>
        x.codigo ? eq(x.codigo, (empleado as any).codigo) : false
      );
      if (DEBUG)
        console.debug("[CalculoNominas] búsqueda por código:", {
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
      console.debug("[CalculoNominas] búsqueda por nombre:", {
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
          console.debug("[CalculoNominas] realineado por código →", target);
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
        "[CalculoNominas] realineado al primero del índice →",
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
      console.debug("[CalculoNominas] estado navegación", {
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
            "[CalculoNominas] Cargando empleado completo:",
            empleadoId
          );
        const empleadoCompleto = await EmpleadoService.getById(empleadoId);
        setEmpleado(empleadoCompleto);
        if (DEBUG)
          console.debug("[CalculoNominas] Empleado cargado:", empleadoCompleto);
      } catch (error) {
        console.error("[CalculoNominas] Error al cargar empleado:", error);
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
      console.debug("[CalculoNominas] goPrev llamado", {
        empleadosIndexLength: empleadosIndex?.length,
        hayPrev,
        idx,
        empleadoId: empleado?.id,
      });
    }

    if (empleadosIndex?.length && hayPrev) {
      const prev = empleadosIndex[idx - 1];
      if (DEBUG) console.debug("[CalculoNominas] goPrev ->", prev);
      // Si hay código, navegar a la nueva ruta; si no, cargar directamente
      if (prev.codigo) {
        navigate(`/rrhh/colaboradores/nomina/${prev.codigo}`, {
          state: {
            selectedEmpresaId,
            searchTerm,
          },
        });
      } else {
        cargarEmpleadoCompleto(prev.id);
      }
    } else if (onPrevious) {
      if (DEBUG) console.debug("[CalculoNominas] goPrev -> onPrevious()");
      onPrevious();
    } else if (DEBUG) {
      console.debug("[CalculoNominas] goPrev disabled");
    }
  };

  const goNext = () => {
    if (DEBUG) {
      console.debug("[CalculoNominas] goNext llamado", {
        empleadosIndexLength: empleadosIndex?.length,
        hayNext,
        idx,
        empleadoId: empleado?.id,
      });
    }

    if (empleadosIndex?.length && hayNext) {
      const next = empleadosIndex[idx + 1];
      if (DEBUG) console.debug("[CalculoNominas] goNext ->", next);
      // Si hay código, navegar a la nueva ruta; si no, cargar directamente
      if (next.codigo) {
        navigate(`/rrhh/colaboradores/nomina/${next.codigo}`, {
          state: {
            selectedEmpresaId,
            searchTerm,
          },
        });
      } else {
        cargarEmpleadoCompleto(next.id);
      }
    } else if (onNext) {
      if (DEBUG) console.debug("[CalculoNominas] goNext -> onNext()");
      onNext();
    } else if (DEBUG) {
      console.debug("[CalculoNominas] goNext disabled");
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
    <Fade in={!!empleado} timeout={400}>
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
              p: { xs: 2, sm: 3 },
              mb: 4,
              background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
              color: "white",
              position: "relative", // <-- necesario para botón flotante
            }}
          >
            {/* Botón VOLVER flotante */}
            <IconButton
              onClick={goBackToList}
              title="Volver a lista de colaboradores"
              aria-label="Volver"
              sx={{
                position: "absolute",
                top: { xs: 4, sm: 8 },
                left: { xs: 4, sm: 8 },
                width: { xs: 28, sm: 30 },
                height: { xs: 28, sm: 30 },
                zIndex: 2,
                color: "white",
                backgroundColor: "rgba(0,0,0,0.2)",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.32)" },
                boxShadow: 1,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: { xs: 14, sm: 15 } }} />
            </IconButton>

            {/* Contenedor principal - responsive */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: { xs: 2, sm: 3 },
                alignItems: { xs: "stretch", md: "center" },
                pt: { xs: 4, sm: 0 },
              }}
            >
              {/* Sección de navegación y avatar - responsive - TODO DENTRO */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1.5, sm: 2, md: 3 },
                  alignItems: "center",
                  flex: { xs: "none", md: 2 },
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {/* Botón Anterior - izquierda */}
                <Box
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconButton
                    onClick={goPrev}
                    disabled={!(empleadosIndex?.length ? hayPrev : hasPrevious)}
                    sx={{
                      color: "white",
                      opacity: (empleadosIndex?.length ? hayPrev : hasPrevious)
                        ? 1
                        : 0.5,
                      width: { sm: 40, md: 48 },
                      height: { sm: 40, md: 48 },
                      "& .MuiSvgIcon-root": {
                        fontSize: { sm: 32, md: 40 },
                      },
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                      },
                    }}
                    title={`Anterior${
                      empleadosIndex?.length
                        ? ` (${idx + 1}/${empleadosIndex.length})`
                        : ""
                    }`}
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                </Box>

                {/* Avatar + datos + selector de período - centro */}
                <Box
                  sx={{
                    display: "flex",
                    gap: { xs: 1.5, sm: 2, md: 3 },
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    width: "100%",
                    flexWrap: { xs: "wrap", sm: "nowrap" },
                  }}
                >
                  <Avatar
                    src={getImageUrl(empleado.urlFotoPerfil)}
                    alt={`${empleado.nombre} ${empleado.apellido}`}
                    sx={{
                      width: { xs: 60, sm: 80, md: 100 },
                      height: { xs: 60, sm: 80, md: 100 },
                      border: "3px solid white",
                      flexShrink: 0,
                    }}
                  >
                    {empleado.nombre?.[0]}
                  </Avatar>

                  <Box
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      overflow: "hidden",
                      textAlign: { xs: "center", sm: "left" },
                    }}
                  >
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{
                        fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
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
                          fontSize: {
                            xs: "0.875rem",
                            sm: "1rem",
                            md: "1.125rem",
                          },
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {empleado.cargo}
                      </Typography>
                    )}
                    <Typography
                      variant="subtitle1"
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {empleado.codigo || "Sin código asignado"}
                    </Typography>
                  </Box>

                  {/* Selector de período - dentro del contenedor de datos del empleado en pantallas no pequeñas */}
                  <Box
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FormControl
                      size="small"
                      sx={{
                        minWidth: { sm: 250, md: 300 },
                        width: { sm: "auto" },
                      }}
                    >
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
                  </Box>
                </Box>

                {/* Botón Siguiente - derecha */}
                <Box
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconButton
                    onClick={goNext}
                    disabled={!(empleadosIndex?.length ? hayNext : hasNext)}
                    sx={{
                      color: "white",
                      opacity: (empleadosIndex?.length ? hayNext : hasNext)
                        ? 1
                        : 0.5,
                      width: { sm: 40, md: 48 },
                      height: { sm: 40, md: 48 },
                      "& .MuiSvgIcon-root": {
                        fontSize: { sm: 32, md: 40 },
                      },
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                      },
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
              </Box>

              {/* Selector de período - solo visible en móvil (xs) */}
              <Box
                sx={{
                  display: { xs: "flex", sm: "none" },
                  flexDirection: "column",
                  gap: 1.5,
                  alignItems: "stretch",
                }}
              >
                <FormControl
                  size="small"
                  sx={{
                    width: "100%",
                  }}
                >
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
              </Box>

              {/* Botones de navegación para móvil - solo en xs */}
              <Box
                sx={{
                  display: { xs: "flex", sm: "none" },
                  justifyContent: "center",
                  gap: 2,
                  mt: 1,
                }}
              >
                <IconButton
                  onClick={goPrev}
                  disabled={!(empleadosIndex?.length ? hayPrev : hasPrevious)}
                  sx={{
                    color: "white",
                    opacity: (empleadosIndex?.length ? hayPrev : hasPrevious)
                      ? 1
                      : 0.5,
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
                <IconButton
                  onClick={goNext}
                  disabled={!(empleadosIndex?.length ? hayNext : hasNext)}
                  sx={{
                    color: "white",
                    opacity: (empleadosIndex?.length ? hayNext : hasNext)
                      ? 1
                      : 0.5,
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
                  intervalos de ~15 días. Selecciona un período para ver la
                  información.
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
                      <Typography
                        variant="subtitle1"
                        color="error"
                        gutterBottom
                      >
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
                      <Typography
                        variant="subtitle1"
                        color="error"
                        gutterBottom
                      >
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
                  {/* Otros errores de validación generales (empleadoId, etc.) */}
                  {Object.entries(error.response.data.validationErrors)
                    .filter(
                      ([k]) =>
                        !["fechasNoAprobadas", "fechasSinRegistro"].includes(
                          k as string
                        )
                    )
                    .map(([campo, mensajes]: any) => (
                      <Box key={campo} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" color="error">
                          {campo}
                        </Typography>
                        {Array.isArray(mensajes) && mensajes.length > 0 && (
                          <Box sx={{ pl: 2 }}>
                            {mensajes.map((m: string, i: number) => (
                              <Typography key={i} variant="body2" color="error">
                                • {m}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ))}
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
            {/* Información de Contrato */}
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Información de Contrato
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Departamento:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {(empleado as any).departamento ||
                        ((empleado as any).departamentoId
                          ? `Departamento ${(empleado as any).departamentoId}`
                          : "—")}
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
                      <strong>Tipo de Contrato:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {empleado.tipoContrato ?? "—"}
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
                      <strong>Tipo de Horario:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {empleado.tipoHorario ?? "—"}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Sueldo Mensual:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {empleado?.sueldoMensual != null
                        ? formatCurrency(empleado.sueldoMensual)
                        : "—"}
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
                      <strong>Sueldo Quincenal:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {empleado?.sueldoMensual != null
                        ? formatCurrency(empleado.sueldoMensual / 2)
                        : "—"}
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
                      <strong>Sueldo por hora:</strong>
                    </Typography>
                    <Typography variant="body1">
                      {Number.isFinite(Number(empleado?.sueldoMensual))
                        ? formatCurrency(Number(empleado!.sueldoMensual) / 240)
                        : "—"}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Beneficios Acumulados */}
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Beneficios Acumulados
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">
                      <strong>Tiempo Compensatorio (horas):</strong>
                    </Typography>
                    <Typography variant="body1">
                      {(empleado as any).tiempoCompensatorioHoras != null
                        ? `${(empleado as any).tiempoCompensatorioHoras}h`
                        : "—"}
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
                      <strong>Vacaciones (horas):</strong>
                    </Typography>
                    <Typography variant="body1">
                      {(empleado as any).tiempoVacacionesHoras != null
                        ? `${(empleado as any).tiempoVacacionesHoras}h`
                        : "—"}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Información Bancaria y de Contacto (fusionada) */}
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Información Bancaria y de Contacto
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Banco:</strong>{" "}
                    {empleado.banco || "No especificado"}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Tipo de Cuenta:</strong>{" "}
                    {empleado.tipoCuenta || "No especificado"}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Número de Cuenta:</strong>{" "}
                    {empleado.numeroCuenta || "No especificado"}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
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

          {/* Botón para revisar registros diarios */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<CalendarTodayIcon />}
              onClick={() => setModalRegistrosOpen(true)}
              disabled={!rangoValido || !empleado}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                boxShadow: 3,
                "&:hover": {
                  boxShadow: 6,
                  transform: "translateY(-2px)",
                  transition: "all 0.3s ease-in-out",
                },
                "&:disabled": {
                  opacity: 0.5,
                },
              }}
            >
              Revisar Actividades Diarias
            </Button>
          </Box>

          {/* Información de días */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Registro de Incidencias
            </Typography>
            <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mt: 2 }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : resumenHoras ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 },
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
                        {resumenHoras.conteoHoras.conteoDias?.diasLaborados ??
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
                        <strong>Incapacidad cubre empresa (días):</strong>
                      </Typography>
                      <Typography variant="body1">
                        {diasIncapacidadCubreEmpresa}
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
                        <strong>Incapacidad cubre IHSS (días):</strong>
                      </Typography>
                      <Typography variant="body1">
                        {diasIncapacidadCubreIHSS}
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
                        {formatCurrency(montoDiasLaborados || 0)}
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
                        {formatCurrency(montoVacaciones || 0)}
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
                        <strong>Monto incapacidad cubre empresa:</strong>
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(montoIncapacidadCubreEmpresa || 0)}
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
                        <strong>Monto incapacidad IHSS:</strong>
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(montoIncapacidadIHSS || 0)}
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
                        {formatCurrency(subtotalQuincena || 0)}
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
                        {resumenHoras.conteoHoras.conteoDias
                          ?.permisoConSueldo ?? 0}
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
                        <strong>Monto por permisos justificados:</strong>
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(montoPermisosJustificados || 0)}
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
                        {resumenHoras.conteoHoras.conteoDias
                          ?.permisoSinSueldo ?? 0}
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
                        {resumenHoras.conteoHoras.conteoDias?.inasistencias ??
                          0}
                      </Typography>
                    </Box>
                    {/* Incapacidad en horas comentado temporalmente */}
                    {/* <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="body1">
                        <strong>Incapacidad cubre empresa (horas):</strong>
                      </Typography>
                      <Typography variant="body1">
                        {horasIncapacidadCubreEmpresa.toFixed(2)}
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
                        <strong>Incapacidad cubre IHSS (horas):</strong>
                      </Typography>
                      <Typography variant="body1">
                        {horasIncapacidadCubreIHSS.toFixed(2)}
                      </Typography>
                    </Box> */}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  Selecciona un período de nómina del selector para ver la
                  información.
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
              currencyFormatter={(n: number) => formatCurrency(n || 0)}
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
                    setMontoIncapacidadCubreEmpresa(
                      parseDecimalValue(sanitized)
                    );
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
                  disabled={codigoNominaTerminaEnA}
                  helperText={
                    codigoNominaTerminaEnA
                      ? "Primera quincena: sin deducciones"
                      : undefined
                  }
                />
                <TextField
                  label="(+) Monto Incapacidad (IHSS) - No suma a total"
                  type="text"
                  inputMode="decimal"
                  size="small"
                  placeholder="0"
                  value={inputMontoIncapacidadIHSS}
                  onChange={(e) => {
                    const sanitized = sanitizeDecimalInput(e.target.value);
                    setInputMontoIncapacidadIHSS(sanitized);
                    setMontoIncapacidadIHSS(parseDecimalValue(sanitized));
                  }}
                  helperText="Este monto es informativo y NO se incluye en el total de percepciones"
                />
                <TextField
                  label="(+) Monto Excedente IHSS"
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
                  InputProps={{
                    readOnly: errorAlimentacion?.tieneError !== true,
                    endAdornment:
                      !loadingAlimentacion &&
                      errorAlimentacion?.tieneError !== true ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label="Ver detalle de deducción de alimentación"
                            onClick={() =>
                              setModalDetalleAlimentacionOpen(true)
                            }
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                  }}
                  disabled={loadingAlimentacion}
                  helperText={
                    loadingAlimentacion
                      ? "Cargando datos..."
                      : errorAlimentacion?.tieneError
                      ? errorAlimentacion.mensajeError
                      : undefined
                  }
                  error={errorAlimentacion?.tieneError === true}
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
                  disabled={codigoNominaTerminaEnA}
                  helperText={
                    codigoNominaTerminaEnA
                      ? "Primera quincena: sin deducciones"
                      : undefined
                  }
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
                  disabled={codigoNominaTerminaEnA}
                  helperText={
                    codigoNominaTerminaEnA
                      ? "Primera quincena: sin deducciones"
                      : undefined
                  }
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
                  disabled={codigoNominaTerminaEnA}
                  helperText={
                    codigoNominaTerminaEnA
                      ? "Primera quincena: sin deducciones"
                      : undefined
                  }
                />
                <TextField
                  label={`(-) Deducción RAP (1.5% excedente sobre ${formatCurrency(
                    PISO_IHSS
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
                  disabled={codigoNominaTerminaEnA}
                  helperText={
                    codigoNominaTerminaEnA
                      ? "Primera quincena: sin deducciones"
                      : undefined
                  }
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
                    {formatCurrency(totalPercepciones)}
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
                    {formatCurrency(totalDeducciones)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body1">
                    <strong>Total Neto a Pagar:</strong>
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(totalNetoPagar)}
                  </Typography>
                </Box>
              </Box>

              {/* Campo de comentario */}
              <Box sx={{ mt: 3 }}>
                <TextField
                  label="Comentario"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Agregar comentario adicional (máximo 200 caracteres)"
                  value={comentario}
                  onChange={(e) =>
                    setComentario(e.target.value.substring(0, 200))
                  }
                  inputProps={{ maxLength: 200 }}
                  helperText={`${comentario.length}/200 caracteres`}
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                {nominaExiste && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Ya existe una nómina generada para el período seleccionado (
                    {fechaInicio} - {fechaFin}). No se puede generar otra nómina
                    para el mismo intervalo.
                  </Alert>
                )}
                <Box sx={{ textAlign: "right" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={crearNominaDisabled || loadingNominaCheck}
                    onClick={handleGenerarNomina}
                  >
                    {loadingNominaCheck ? "Verificando..." : "Generar Nómina"}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
        {/* Modal de detalle de registros diarios */}
        <DetalleRegistrosDiariosModal
          open={modalRegistrosOpen}
          onClose={() => setModalRegistrosOpen(false)}
          empleadoId={Number(empleado.id)}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          nombreEmpleado={`${empleado.nombre} ${empleado.apellido}`}
        />
        <Dialog
          open={modalDetalleAlimentacionOpen}
          onClose={() => setModalDetalleAlimentacionOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Detalle de deducción de alimentación</DialogTitle>
          <DialogContent dividers>
            {detalleDeduccionAlimentacion.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Costo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalleDeduccionAlimentacion.map((item, index) => (
                    <TableRow key={`${item.fecha}-${index}`}>
                      <TableCell>{item.producto || "N/D"}</TableCell>
                      <TableCell>
                        {new Date(item.fecha).toLocaleDateString("es-HN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.precio || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Total
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight={600}>
                        {formatCurrency(totalDetalleAlimentacion)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No se registran consumos de alimentación para este período.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalDetalleAlimentacionOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Fade>
  );
};

export default CalculoNominas;
