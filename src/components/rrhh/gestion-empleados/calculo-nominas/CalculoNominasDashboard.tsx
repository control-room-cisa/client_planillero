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
import { useNavigate } from "react-router-dom";
import type { Empleado } from "../../../../services/empleadoService";
import type { EmpleadoIndexItem } from "../../../Layout";
import { getImageUrl } from "../../../../utils/imageUtils";
import { useHorasTrabajo } from "../../../../hooks/useHorasTrabajo";
import DesgloseIncidenciasComponent from "../DesgloseIncidencias";
import NominaService, {
  type CrearNominaDto,
} from "../../../../services/nominaService";
import DetalleRegistrosDiariosModal from "../detalleRegistrosDiariosModal";

// Utilidades puras del módulo de cálculo de nóminas
import { roundTo2Decimals, formatCurrency } from "./utils/formatters";

// Hooks de negocio del módulo de cálculo de nóminas
import { useNominaPeriodos } from "./hooks/useNominaPeriodos";
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
}

const DEBUG = true;

const CalculoNominas: React.FC<CalculoNominasProps> = ({
  empleado: empleadoProp,
  empleadosIndex: empleadosIndexProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const navigate = useNavigate();

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
  } = useNominaPeriodos();

  // ========= Configuración global (PISO_IHSS / DEDUCCION_IHSS_FIJA) =========
  const { cfgPisoIhss, cfgDeduccionIhssFija } = useGlobalConfigNomina();
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
  const horasCompensatoriasDevueltas =
    resumenHoras?.conteoHoras?.cantidadHoras?.horasCompensatoriasDevueltas ?? 0;
  const totalCompensatoriasQuincena =
    horasCompensatoriasDevueltas - horasCompensatoriasTomadas;

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
  const diasCompensatoriasTomadas = conteoDias?.compensatoriasTomadas ?? 0;

  // Días laborados: el backend ya resta incapacidades, vacaciones, permisos, compensatorias tomadas, etc.
  // Recalculamos aquí para asegurar consistencia con los datos mostrados
  const diasLaborados = Math.max(
    0,
    (periodoNomina || 15) -
      (diasVacaciones || 0) -
      (diasPermisoCS || 0) -
      (diasIncapacidadCubreEmpresa || 0) -
      (diasIncapacidadCubreIHSS || 0) -
      ((conteoDias?.permisoSinSueldo ?? 0) || 0) -
      ((conteoDias?.inasistencias ?? 0) || 0) -
      (diasCompensatoriasTomadas || 0),
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

  const montoDiasLaborados =
    (diasLaborados / (periodoNomina || 15)) * salarioQuincenal;
  const montoVacaciones =
    (diasVacaciones / (periodoNomina || 15)) * salarioQuincenal;

  // Horas de permisos justificados: usar horas del resumen si existen, si no días × 8
  const horasPermisosJustificados =
    Number(
      (resumenHoras as any)?.conteoHoras?.cantidadHoras
        ?.permisoConSueldoHoras ?? diasPermisoCS * 8,
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

  // ========= Deducciones / ajustes =========
  const deducciones = useDeduccionesNomina({
    fechaInicio,
    fechaFin,
    codigoNominaTerminaEnA,
    isPrimeraQuincena,
    sueldoMensual,
    PISO_IHSS,
    DEDUCCION_IHSS_FIJA,
    diasIncapacidadCubreEmpresa,
    diasIncapacidadCubreIHSS,
  });
  const {
    montoIncapacidadCubreEmpresa,
    montoIncapacidadIHSS,
    ajuste,
    montoExcedenteIHSS,
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
  /** Compensatorias tomadas se valorizan a tarifa hora normal y suman a percepciones */
  const montoCompensatoriasTomadas = roundTo2Decimals(
    (horas?.horasCompensatoriasTomadas || 0) * salarioPorHora,
  );

  // ========= Alimentación =========
  const {
    deduccionAlimentacion,
    setDeduccionAlimentacion,
    inputDeduccionAlimentacion,
    setInputDeduccionAlimentacion,
    detalleDeduccionAlimentacion,
    totalDetalleAlimentacion,
    loadingAlimentacion,
    errorAlimentacion,
    modalDetalleAlimentacionOpen,
    setModalDetalleAlimentacionOpen,
  } = useAlimentacionPorCodigo({
    empleado,
    fechaInicio,
    fechaFin,
    rangoValido,
    codigoNominaPeriodo,
  });

  // ========= Estado local UI (modales / toast) =========
  const [modalRegistrosOpen, setModalRegistrosOpen] = React.useState(false);

  // ========= Nómina existente =========
  const { nominaExiste, setNominaExiste, loadingNominaCheck } =
    useNominaExistente({
      empleadoId: empleado?.id,
      fechaInicio,
      fechaFin,
      rangoValido,
    });

  // ========= Totales =========
  // NOTA: montoIncapacidadIHSS NO se suma al total de percepciones
  const totalPercepciones =
    (subtotalQuincena || 0) +
    (montoExcedenteIHSS || 0) +
    (montoHoras25 || 0) +
    (montoHoras50 || 0) +
    (montoHoras75 || 0) +
    (montoHoras100 || 0) +
    (montoCompensatoriasTomadas || 0) +
    (ajuste || 0);

  const totalDeducciones =
    (deduccionIHSS || 0) +
    (deduccionISR || 0) +
    (deduccionRAP || 0) +
    (deduccionAlimentacion || 0) +
    (cobroPrestamo || 0) +
    (impuestoVecinal || 0) +
    (otros || 0);

  const totalNetoPagar = (totalPercepciones || 0) - (totalDeducciones || 0);

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
  // Bloqueo por errores de validación (no se puede procesar la nómina)
  const bloqueaPorValidacion = Boolean(
    (error as any)?.response?.data?.validationErrors,
  );

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

      const payload: CrearNominaDto = {
        empleadoId: Number(empleado.id),
        nombrePeriodoNomina: getNombrePeriodoNomina(fechaInicio, fechaFin),
        fechaInicio,
        fechaFin,
        sueldoMensual: Number(empleado.sueldoMensual || 0),

        diasLaborados: diasLaborados || 0,
        diasVacaciones: diasVacaciones || 0,
        diasIncapacidadEmpresa: diasIncapacidadCubreEmpresa || 0,
        diasIncapacidadIHSS: diasIncapacidadCubreIHSS || 0,
        horasCompensatorias: totalCompensatoriasQuincena,

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
      setNominaExiste(true);
      await refetch();
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
                  💡 Elige el año y la quincena (12–26 o 27–11 según reglas de
                  nómina). En el año en curso aparecen períodos cerrados y
                  también el período en curso. Selecciona un período para ver la
                  información.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Error */}
          <ErrorValidacionNomina error={error} onRetry={refetch} />

          {/* Tarjetas informativas */}
          <InfoColaboradorCards
            empleado={empleado}
            formatCurrency={formatCurrencyCb}
          />

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
          <ResumenIncidencias
            loading={loading}
            resumenHoras={resumenHoras}
            periodoNomina={periodoNomina}
            diasIncapacidadCubreEmpresa={diasIncapacidadCubreEmpresa}
            diasIncapacidadCubreIHSS={diasIncapacidadCubreIHSS}
            montoDiasLaborados={montoDiasLaborados}
            montoVacaciones={montoVacaciones}
            montoIncapacidadCubreEmpresa={montoIncapacidadCubreEmpresa}
            montoIncapacidadIHSS={montoIncapacidadIHSS}
            subtotalQuincena={subtotalQuincena}
            montoPermisosJustificados={montoPermisosJustificados}
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
            errorAlimentacion={errorAlimentacion}
            loadingAlimentacion={loadingAlimentacion}
            onOpenDetalleAlimentacion={() =>
              setModalDetalleAlimentacionOpen(true)
            }
            totalPercepciones={totalPercepciones}
            totalDeducciones={totalDeducciones}
            totalNetoPagar={totalNetoPagar}
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

        <ModalDetalleAlimentacion
          open={modalDetalleAlimentacionOpen}
          onClose={() => setModalDetalleAlimentacionOpen(false)}
          detalle={detalleDeduccionAlimentacion}
          totalDetalle={totalDetalleAlimentacion}
          formatCurrency={formatCurrencyCb}
        />
      </Container>
    </Fade>
  );
};

export default CalculoNominas;
