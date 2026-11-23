import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Container,
  IconButton,
  Button,
  Alert,
  Snackbar,
  Fade,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useNavigate } from "react-router-dom";
import type { Empleado } from "../../../../services/empleadoService";
import EmpleadoService from "../../../../services/empleadoService";
import type { EmpleadoIndexItem } from "../../../Layout";
import { getImageUrl } from "../../../../utils/imageUtils";
import { useHorasTrabajo } from "../../../../hooks/useHorasTrabajo";
import DesgloseIncidenciasComponent from "../DesgloseIncidencias";
import NominaService, {
  type CrearNominaDto,
} from "../../../../services/nominaService";
import RegistroDiarioService from "../../../../services/registroDiarioService";
import DetalleRegistrosDiariosModal from "../detalleRegistrosDiariosModal";
import TiempoCompensatorioAcumulado from "../../../common/TiempoCompensatorioAcumulado";
import ErrorValidacionPeriodo, {
  hasPendingValidations,
  type ValidationErrorsMap,
} from "../../../common/ErrorValidacionPeriodo";

// Utilidades puras del módulo de cálculo de nóminas
import {
  roundTo2Decimals,
  formatCurrency,
  montoPorDiasQuincena,
} from "./utils/formatters";
import { derivarCodigoNomina } from "./utils/periodos";
import { usePeriodosNominaConfig } from "../../../../contexts/PeriodosNominaConfigContext";

// Hooks de negocio del módulo de cálculo de nóminas
import {
  useNominaPeriodos,
  type UseNominaPeriodosReturn,
} from "./hooks/useNominaPeriodos";
import { useGlobalConfigNomina } from "./hooks/useGlobalConfigNomina";
import { useAlimentacionPorCodigo } from "./hooks/useAlimentacionPorCodigo";
import { useDeduccionesNomina } from "./hooks/useDeduccionesNomina";
import { useEmpleadoNavigation } from "./hooks/useEmpleadoNavigation";
import { useNominaExistente } from "./hooks/useNominaExistente";

// Subcomponentes de UI del módulo
import NominaPeriodoSelector from "./components/NominaPeriodoSelector";
import InfoColaboradorCards from "./components/InfoColaboradorCards";
import ResumenIncidencias from "./components/ResumenIncidencias";
import DeduccionesAjustesForm from "./components/DeduccionesAjustesForm";
import ModalDetalleAlimentacion from "./components/ModalDetalleAlimentacion";
import ErrorValidacionNomina from "./components/ErrorValidacionNomina";

interface CalculoNominasProps {
  empleado?: Empleado;
  empleadosIndex?: EmpleadoIndexItem[];
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  /** Estado del período elevado al route para conservarlo al cambiar de colaborador */
  nominaPeriodos?: UseNominaPeriodosReturn;
}

interface CalculoNominasViewProps extends Omit<CalculoNominasProps, "nominaPeriodos"> {
  nominaPeriodos: UseNominaPeriodosReturn;
}

const DEBUG = true;

const CalculoNominasView: React.FC<CalculoNominasViewProps> = ({
  empleado: empleadoProp,
  empleadosIndex: empleadosIndexProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  nominaPeriodos,
}) => {
  const navigate = useNavigate();
  const { config: periodosConfig, descripcionCortes } =
    usePeriodosNominaConfig();

  // ========= Navegación entre empleados =========
  const {
    empleado,
    empleadosIndex,
    idx,
    hayPrev,
    hayNext,
    goPrev,
    goNext,
    goBackToList,
  } = useEmpleadoNavigation({
    empleadoProp,
    empleadosIndexProp,
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
  });

  // ========= Selector de período =========
  const {
    añoNominas,
    añosDisponibles,
    intervalosDelAño,
    intervaloSeleccionado,
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
  } = nominaPeriodos;

  // ========= Configuración global (PISO_IHSS / DEDUCCION_IHSS_FIJA) =========
  const { cfgPisoIhss, cfgDeduccionIhssFija, politicaDeducciones } =
    useGlobalConfigNomina();
  const PISO_IHSS = cfgPisoIhss;
  const DEDUCCION_IHSS_FIJA = cfgDeduccionIhssFija;

  // ========= Resumen de horas (backend) =========
  const { resumenHoras, loading, error, refetch } = useHorasTrabajo({
    empleadoId: empleado?.id || "",
    fechaInicio,
    fechaFin,
    enabled: !!empleado && rangoValido,
  });

  // Cálculos de horas compensatorias
  const horasCompensatoriasTomadas =
    resumenHoras?.conteoHoras?.cantidadHoras?.horasCompensatoriasTomadas ?? 0;
  const horasCompensatoriasAcumuladas =
    resumenHoras?.conteoHoras?.cantidadHoras?.horasCompensatoriasAcumuladas ?? 0;
  const totalCompensatoriasQuincena =
    horasCompensatoriasAcumuladas - horasCompensatoriasTomadas;

  // Sueldo vigente al inicio del período (historial de salarios)
  const [sueldoVigentePeriodo, setSueldoVigentePeriodo] = React.useState<
    number | null
  >(null);
  React.useEffect(() => {
    let cancelled = false;
    const empId = empleado?.id != null ? Number(empleado.id) : NaN;
    if (!Number.isFinite(empId) || !fechaInicio) {
      setSueldoVigentePeriodo(null);
      return;
    }
    EmpleadoService.getSueldoVigente(empId, fechaInicio)
      .then((r) => {
        if (!cancelled) setSueldoVigentePeriodo(Number(r.sueldoMensual ?? 0));
      })
      .catch(() => {
        if (!cancelled) {
          setSueldoVigentePeriodo(Number((empleado as any)?.sueldoMensual ?? 0));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [empleado?.id, (empleado as any)?.sueldoMensual, fechaInicio]);

  // Cálculos de salario y montos
  const sueldoMensual =
    sueldoVigentePeriodo ?? Number((empleado as any)?.sueldoMensual ?? 0);
  const conteoDias = resumenHoras?.conteoHoras?.conteoDias;
  const periodoNomina = conteoDias?.totalPeriodo ?? 15;
  const diasVacaciones = conteoDias?.vacaciones ?? 0;
  const diasPermisoCS = conteoDias?.permisoConSueldo ?? 0; // justificado

  // Incapacidades (nombres correctos del backend)
  const diasIncapacidadCubreEmpresa =
    conteoDias?.incapacidadEmpresa ??
    conteoDias?.incapacidadCubreEmpresaDias ??
    0;
  // Incapacidad IHSS: días calendario literales (subsidio); cuadre días usa LRM en conteoDias
  const diasIncapacidadIhssCalendario =
    resumenHoras?.conteoHoras?.incapacidadIhss?.diasIhss ?? 0;
  const diasIncapacidadCubreIHSS =
    conteoDias?.incapacidadIHSS ?? conteoDias?.incapacidadCubreIHSSDias ?? 0;

  // Días laborados: incluye permiso justificado (E03) dentro del monto de días laborados.
  // No se restan compensatorias tomadas (se pagan aparte como horas).
  const diasLaborados = Math.max(
    0,
    (periodoNomina || 15) -
      (diasVacaciones || 0) -
      (diasIncapacidadCubreEmpresa || 0) -
      (diasIncapacidadCubreIHSS || 0) -
      ((conteoDias?.permisoSinSueldo ?? 0) || 0) -
      ((conteoDias?.inasistencias ?? 0) || 0),
  );

  const salarioQuincenal = React.useMemo(
    () => (sueldoMensual || 0) / 2,
    [sueldoMensual],
  );
  const salarioPorHora = React.useMemo(
    () => (sueldoMensual || 0) / (30 * 8),
    [sueldoMensual],
  );
  const formatCurrencyCb = React.useCallback(
    (valor: number) => formatCurrency(valor),
    [],
  );

  const montoDiasLaborados = montoPorDiasQuincena(
    salarioQuincenal,
    diasLaborados,
    periodoNomina,
  );
  const montoVacaciones = montoPorDiasQuincena(
    salarioQuincenal,
    diasVacaciones,
    periodoNomina,
  );

  // Permiso justificado (E03): solo informativo (tiempo). Su pago va en montoDiasLaborados.
  const horasPermisosJustificados =
    Number(
      (resumenHoras as any)?.conteoHoras?.cantidadHoras
        ?.permisoConSueldoHoras ??
        (resumenHoras as any)?.conteoHoras?.cantidadHoras?.permisoConSueldo ??
        diasPermisoCS * 8,
    ) || 0;
  const montoPermisosJustificados = 0;

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

  // Deducciones predefinidas del colaborador (monto mensual; reparto según política)
  const empleadoIsr = Number((empleado as Empleado)?.isr) || 0;
  const empleadoAporteVoluntarioRap =
    Number((empleado as Empleado)?.aporteVoluntarioRap) || 0;

  // ========= Deducciones / ajustes =========
  const deducciones = useDeduccionesNomina({
    fechaInicio,
    fechaFin,
    codigoNominaTerminaEnA,
    isPrimeraQuincena,
    sueldoMensual,
    salarioQuincenal,
    PISO_IHSS,
    DEDUCCION_IHSS_FIJA,
    politicaDeducciones,
    diasIncapacidadCubreEmpresa,
    diasIncapacidadCubreIHSS,
    montoIncapacidadIHSSFromBackend:
      resumenHoras?.conteoHoras?.incapacidadIhss?.montoIhss,
    empleadoIsr,
    empleadoAporteVoluntarioRap,
  });
  const {
    montoIncapacidadCubreEmpresa,
    montoIncapacidadIHSS,
    ajuste,
    anticipoPago,
    deduccionIHSS,
    deduccionRAP,
    deduccionISR,
    cobroPrestamo,
    impuestoVecinal,
    otros,
    comentario,
  } = deducciones;

  const subtotalQuincena =
    (montoDiasLaborados || 0) +
    (montoVacaciones || 0) +
    (montoIncapacidadCubreEmpresa || 0);

  // Cálculo de horas normales: días laborados × 8 horas
  const horasNormales = diasLaborados * 8;

  // Montos por horas (no incluidos en subtotal)
  const horas = resumenHoras?.conteoHoras?.cantidadHoras;
  const montoHorasNormales = roundTo2Decimals(horasNormales * salarioPorHora);
  const montoHoras25 = roundTo2Decimals(
    (horas?.p25 || 0) * salarioPorHora * 1.25,
  );
  const montoHoras50 = roundTo2Decimals(
    (horas?.p50 || 0) * salarioPorHora * 1.5,
  );
  const montoHoras75 = roundTo2Decimals(
    (horas?.p75 || 0) * salarioPorHora * 1.75,
  );
  const montoHoras100 = roundTo2Decimals(
    (horas?.p100 || 0) * salarioPorHora * 2.0,
  );
  /** Compensatorias tomadas: monto ref. a tarifa normal (informativo, no suma al total bruto) */
  const montoCompensatoriasTomadas = roundTo2Decimals(
    (horas?.horasCompensatoriasTomadas || 0) * salarioPorHora,
  );
  /** Compensatorias acumuladas: solo informativo, no forman parte del pago */
  const montoCompensatoriasAcumuladasRef = roundTo2Decimals(
    horasCompensatoriasAcumuladas * salarioPorHora,
  );

  // ========= Alimentación / Alojamiento (mismo query) =========
  const {
    deduccionAlimentacion,
    setDeduccionAlimentacion,
    inputDeduccionAlimentacion,
    setInputDeduccionAlimentacion,
    detalleDeduccionAlimentacion,
    totalDetalleAlimentacion,
    deduccionAlojamiento,
    setDeduccionAlojamiento,
    inputDeduccionAlojamiento,
    setInputDeduccionAlojamiento,
    detalleDeduccionAlojamiento,
    totalDetalleAlojamiento,
    loadingAlimentacion,
    errorAlimentacion,
    modalDetalleAlimentacionOpen,
    setModalDetalleAlimentacionOpen,
    modalDetalleAlojamientoOpen,
    setModalDetalleAlojamientoOpen,
  } = useAlimentacionPorCodigo({
    empleado,
    fechaInicio,
    fechaFin,
    rangoValido,
    codigoNominaPeriodo,
  });

  // ========= Estado local UI (modales / toast) =========
  const [modalRegistrosOpen, setModalRegistrosOpen] = React.useState(false);
  const [modalCompensatorioOpen, setModalCompensatorioOpen] =
    React.useState(false);

  // ========= Nómina existente =========
  const { nominaExiste, setNominaExiste, loadingNominaCheck } =
    useNominaExistente({
      empleadoId: empleado?.id,
      fechaInicio,
      fechaFin,
      rangoValido,
    });

  // ========= Totales =========
  const totalHorasExtra = roundTo2Decimals(
    (montoHoras25 || 0) +
      (montoHoras50 || 0) +
      (montoHoras75 || 0) +
      (montoHoras100 || 0),
  );

  // Total bruto = subtotal + horas extra + ajuste + anticipo (alineado con NominaFormModal)
  const totalBruto = roundTo2Decimals(
    (subtotalQuincena || 0) +
      totalHorasExtra +
      (ajuste || 0) +
      (anticipoPago || 0),
  );

  const totalDeducciones = roundTo2Decimals(
    (deduccionIHSS || 0) +
      (deduccionISR || 0) +
      (deduccionRAP || 0) +
      (deduccionAlimentacion || 0) +
      (deduccionAlojamiento || 0) +
      (cobroPrestamo || 0) +
      (impuestoVecinal || 0) +
      (otros || 0),
  );

  const totalAPagar = roundTo2Decimals(
    (totalBruto || 0) - (totalDeducciones || 0),
  );

  // ========= Toast (MUI Snackbar) =========
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");
  const [toastSeverity, setToastSeverity] = React.useState<
    "success" | "error" | "info" | "warning"
  >("info");
  const showToast = React.useCallback(
    (
      message: string,
      severity: "success" | "error" | "info" | "warning" = "info",
    ) => {
      setToastMessage(message);
      setToastSeverity(severity);
      setToastOpen(true);
    },
    [],
  );
  const handleToastClose = React.useCallback(() => setToastOpen(false), []);

  // ========= Crear nómina =========
  // Bloqueo por errores de validación (respuesta de error o soft warnings del conteo)
  const validacionesConteo = resumenHoras?.conteoHoras
    ?.validationErrors as ValidationErrorsMap | undefined;
  const bloqueaPorValidacion =
    hasPendingValidations(
      (error as any)?.response?.data?.validationErrors as
        | ValidationErrorsMap
        | undefined,
    ) || hasPendingValidations(validacionesConteo);

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
          "error",
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
      const codigoPeriodo = derivarCodigoNomina(
        fechaInicio,
        fechaFin,
        periodosConfig,
      );
      const duplicadaPorCodigo = existentes.some(
        (n) => n.codigoNomina && n.codigoNomina === codigoPeriodo
      );
      if (duplicadaPorCodigo) {
        showToast(
          `Ya existe una nómina para este colaborador en el período ${codigoPeriodo}`,
          "error"
        );
        return;
      }

      const overlapped = existentes.some((n) => {
        const s = toDate(n.fechaInicio as any);
        const e = toDate(n.fechaFin as any);
        return s <= endNew && startNew <= e;
      });
      if (overlapped) {
        showToast(
          "Ya existe una nómina que traslapa con el período seleccionado",
          "error",
        );
        return;
      }

      // Desglose de horas acumuladas crudas por job (actividades esCompensatorio + esExtra)
      const tiempoComp = await RegistroDiarioService.getTiempoCompensatorio(
        Number(empleado.id),
      );
      const horasPorJobMap = new Map<string, { jobId: number | null; horas: number }>();
      for (const act of tiempoComp.acumuladas) {
        const fechaAct = String(act.fecha).slice(0, 10);
        if (fechaAct < fechaInicio || fechaAct > fechaFin) continue;
        const horas = Number(act.duracionHoras || 0);
        if (horas <= 0) continue;
        const jobId =
          act.jobId == null || Number.isNaN(Number(act.jobId))
            ? null
            : Number(act.jobId);
        const key = jobId == null ? "null" : String(jobId);
        const prev = horasPorJobMap.get(key);
        if (prev) prev.horas += horas;
        else horasPorJobMap.set(key, { jobId, horas });
      }
      const bancoCompensatoriasAplicadas = Array.from(horasPorJobMap.values())
        .map((row) => ({
          jobId: row.jobId,
          horas: roundTo2Decimals(row.horas),
        }))
        .filter((row) => row.horas > 0);

      if (bancoCompensatoriasAplicadas.some((row) => row.jobId == null)) {
        showToast(
          "Hay horas compensatorias acumuladas con job no identificado; se registrarán como job no definido en el banco.",
          "warning",
        );
      }

      const payload: CrearNominaDto = {
        empleadoId: Number(empleado.id),
        nombrePeriodoNomina: getNombrePeriodoNomina(fechaInicio, fechaFin),
        fechaInicio,
        fechaFin,
        sueldoMensual: Number(sueldoMensual || 0),

        diasLaborados: diasLaborados || 0,
        diasVacaciones: diasVacaciones || 0,
        diasIncapacidadEmpresa: diasIncapacidadCubreEmpresa || 0,
        diasIncapacidadIHSS: diasIncapacidadCubreIHSS || 0,
        horasCompensatorias: totalCompensatoriasQuincena,
        bancoCompensatoriasAplicadas,

        subtotalQuincena: subtotalQuincena || 0,
        montoVacaciones: montoVacaciones || 0,
        montoDiasLaborados: montoDiasLaborados || 0,
        montoExcedenteIHSS: 0,
        montoIncapacidadCubreEmpresa: montoIncapacidadCubreEmpresa || 0,
        montoPermisosJustificados: montoPermisosJustificados || 0,

        // Horas extra (montos + cantidades totales por %)
        // Normal no se guarda como campo separado en backend; se refleja en montos de días
        montoHoras25: montoHoras25 || 0,
        montoHoras50: montoHoras50 || 0,
        montoHoras75: montoHoras75 || 0,
        montoHoras100: montoHoras100 || 0,
        cantidadHoras25: horas?.p25 || 0,
        cantidadHoras50: horas?.p50 || 0,
        cantidadHoras75: horas?.p75 || 0,
        cantidadHoras100: horas?.p100 || 0,

        // Ajustes y totales (total bruto/neto alineados con prorrateo)
        ajuste: ajuste || 0,
        anticipoPago: anticipoPago || 0,
        totalPercepciones: totalBruto || 0,
        deduccionIHSS: deduccionIHSS || 0,
        deduccionISR: deduccionISR || 0,
        deduccionRAP: deduccionRAP || 0,
        deduccionAlimentacion: deduccionAlimentacion || 0,
        deduccionAlojamiento: deduccionAlojamiento || 0,
        cobroPrestamo: cobroPrestamo || 0,
        impuestoVecinal: impuestoVecinal || 0,
        otros: otros || 0,
        totalDeducciones: totalDeducciones || 0,
        totalNetoPagar: totalAPagar || 0,

        comentario: comentario || null,
      };

      const creada = await NominaService.create(payload);
      showToast(`Nómina creada (ID ${creada.id})`, "success");
      setNominaExiste(true);
      await refetch();
    } catch (err: any) {
      console.error("Error al crear nómina:", err);
      const apiMsg = err?.response?.data?.message;
      showToast(apiMsg || err?.message || "Error al crear nómina", "error");
    }
  }, [
    empleado?.id,
    sueldoMensual,
    rangoValido,
    fechaInicio,
    fechaFin,
    diasLaborados,
    diasVacaciones,
    diasIncapacidadCubreEmpresa,
    diasIncapacidadCubreIHSS,
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
    horas,
    showToast,
    bloqueaPorValidacion,
    ajuste,
    anticipoPago,
    totalBruto,
    deduccionIHSS,
    deduccionISR,
    deduccionRAP,
    deduccionAlimentacion,
    deduccionAlojamiento,
    cobroPrestamo,
    impuestoVecinal,
    otros,
    totalDeducciones,
    totalAPagar,
    comentario,
    getNombrePeriodoNomina,
    periodosConfig,
    refetch,
    totalCompensatoriasQuincena,
    setNominaExiste,
  ]);

  // Auto-refetch al cambiar empleado si ya hay rango
  React.useEffect(() => {
    if (empleado && rangoValido) {
      if (DEBUG)
        console.debug(
          "[CalculoNominas] empleado cambió → refetch",
          empleado.id,
        );
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleado?.id, rangoValido]);

  // ========= Guard =========
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

                  {/* Año + período de nómina (pantallas sm+) */}
                  <NominaPeriodoSelector
                    variant="inline"
                    añoNominas={añoNominas}
                    añosDisponibles={añosDisponibles}
                    onAñoChange={handleAñoNominasChange}
                    intervalosDelAño={intervalosDelAño}
                    intervaloSeleccionado={intervaloSeleccionado}
                    onIntervaloChange={handleIntervaloChange}
                  />
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

              {/* Año + período — solo visible en móvil (xs) */}
              <NominaPeriodoSelector
                variant="stacked"
                añoNominas={añoNominas}
                añosDisponibles={añosDisponibles}
                onAñoChange={handleAñoNominasChange}
                intervalosDelAño={intervalosDelAño}
                intervaloSeleccionado={intervaloSeleccionado}
                onIntervaloChange={handleIntervaloChange}
              />

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
                  💡 Elige el año y la quincena ({descripcionCortes} según
                  reglas de nómina). En el año en curso aparecen períodos
                  cerrados y también el período en curso. Selecciona un período
                  para ver la información.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Error / validaciones pendientes */}
          <ErrorValidacionNomina error={error} onRetry={refetch} />
          {!error && hasPendingValidations(validacionesConteo) && (
            <ErrorValidacionPeriodo
              validationErrors={validacionesConteo}
              title="No se puede procesar la nómina"
              severity="warning"
            />
          )}

          {/* Tarjetas informativas */}
          <InfoColaboradorCards
            empleado={empleado}
            formatCurrency={formatCurrencyCb}
          />

          {/* Botones: registros diarios y tiempo compensatorio */}
          <Box
            sx={{
              mt: 3,
              textAlign: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              justifyContent: "center",
            }}
          >
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
            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<AccessTimeIcon />}
              onClick={() => setModalCompensatorioOpen(true)}
              disabled={!empleado}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              Tiempo Compensatorio Acumulado
            </Button>
          </Box>

          {/* Información de días */}
          <ResumenIncidencias
            loading={loading}
            resumenHoras={resumenHoras}
            periodoNomina={periodoNomina}
            diasLaborados={diasLaborados}
            diasIncapacidadCubreEmpresa={diasIncapacidadCubreEmpresa}
            diasIncapacidadIhssCalendario={diasIncapacidadIhssCalendario}
            diasIncapacidadCubreIHSSLrm={diasIncapacidadCubreIHSS}
            montoDiasLaborados={montoDiasLaborados}
            montoVacaciones={montoVacaciones}
            montoIncapacidadCubreEmpresa={montoIncapacidadCubreEmpresa}
            montoIncapacidadIHSS={montoIncapacidadIHSS}
            subtotalQuincena={subtotalQuincena}
            diasPermisoJustificado={diasPermisoCS}
            horasPermisoJustificado={horasPermisosJustificados}
            formatCurrency={formatCurrencyCb}
          />

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
                compensatoriasTomadas: montoCompensatoriasTomadas,
                compensatoriasAcumuladas: montoCompensatoriasAcumuladasRef,
              }}
              currencyFormatter={(n: number) => formatCurrencyCb(n || 0)}
              horasNormales={horasNormales}
            />
          </Box>

          {/* Deducciones */}
          <DeduccionesAjustesForm
            nombrePeriodoNomina={nombrePeriodoNomina}
            codigoNominaTerminaEnA={codigoNominaTerminaEnA}
            codigoNominaPeriodo={codigoNominaPeriodo}
            PISO_IHSS={PISO_IHSS}
            formatCurrency={formatCurrencyCb}
            deducciones={deducciones}
            inputDeduccionAlimentacion={inputDeduccionAlimentacion}
            setInputDeduccionAlimentacion={setInputDeduccionAlimentacion}
            setDeduccionAlimentacion={setDeduccionAlimentacion}
            inputDeduccionAlojamiento={inputDeduccionAlojamiento}
            setInputDeduccionAlojamiento={setInputDeduccionAlojamiento}
            setDeduccionAlojamiento={setDeduccionAlojamiento}
            errorAlimentacion={errorAlimentacion}
            loadingAlimentacion={loadingAlimentacion}
            onOpenDetalleAlimentacion={() =>
              setModalDetalleAlimentacionOpen(true)
            }
            onOpenDetalleAlojamiento={() =>
              setModalDetalleAlojamientoOpen(true)
            }
            totalBruto={totalBruto}
            totalDeducciones={totalDeducciones}
            totalAPagar={totalAPagar}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            nominaExiste={nominaExiste}
            crearNominaDisabled={crearNominaDisabled}
            loadingNominaCheck={loadingNominaCheck}
            onGenerarNomina={handleGenerarNomina}
          />
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

        <TiempoCompensatorioAcumulado
          open={modalCompensatorioOpen}
          onClose={() => setModalCompensatorioOpen(false)}
          empleadoId={Number(empleado.id)}
          nombreEmpleado={`${empleado.nombre} ${empleado.apellido ?? ""}`.trim()}
        />

        <ModalDetalleAlimentacion
          open={modalDetalleAlimentacionOpen}
          onClose={() => setModalDetalleAlimentacionOpen(false)}
          detalle={detalleDeduccionAlimentacion}
          totalDetalle={totalDetalleAlimentacion}
          formatCurrency={formatCurrencyCb}
        />

        <ModalDetalleAlimentacion
          open={modalDetalleAlojamientoOpen}
          onClose={() => setModalDetalleAlojamientoOpen(false)}
          detalle={detalleDeduccionAlojamiento}
          totalDetalle={totalDetalleAlojamiento}
          formatCurrency={formatCurrencyCb}
          titulo="Detalle de deducción de alojamiento"
          mensajeVacio="No se registran consumos de alojamiento para este período."
        />
      </Container>
    </Fade>
  );
};

const CalculoNominas: React.FC<CalculoNominasProps> = (props) => {
  if (props.nominaPeriodos) {
    return (
      <CalculoNominasView {...props} nominaPeriodos={props.nominaPeriodos} />
    );
  }
  const nominaPeriodos = useNominaPeriodos();
  return <CalculoNominasView {...props} nominaPeriodos={nominaPeriodos} />;
};

export default CalculoNominas;
