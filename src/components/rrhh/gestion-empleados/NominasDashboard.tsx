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
  Grid,
  Button,
  CircularProgress,
  Alert,
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

interface NominasDashboardProps {
  empleado?: Empleado;
  empleadosIndex?: EmpleadoIndexItem[];
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const DEBUG = true;

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

      intervalos.push({
        label: `${formatearFecha(inicio1)} - ${formatearFecha(fin1)}`,
        fechaInicio: inicio1.toISOString().split("T")[0],
        fechaFin: fin1.toISOString().split("T")[0],
        valor: `${inicio1.toISOString().split("T")[0]}_${
          fin1.toISOString().split("T")[0]
        }`,
      });

      intervalos.push({
        label: `${formatearFecha(inicio2)} - ${formatearFecha(fin2)}`,
        fechaInicio: inicio2.toISOString().split("T")[0],
        fechaFin: fin2.toISOString().split("T")[0],
        valor: `${inicio2.toISOString().split("T")[0]}_${
          fin2.toISOString().split("T")[0]
        }`,
      });
    }

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

  // Guard
  if (!empleado) {
    return (
      <Container maxWidth="md">
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
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
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
                <Typography variant="subtitle1">ID: {empleado.id}</Typography>
              </Box>
            </Box>

            {/* Período + Aplicar */}
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
                empleados
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
            {error}
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
                  {(empleado as any).departamento?.nombre ??
                    (empleado as any).departamento ??
                    "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Contrato:</strong>{" "}
                  {empleado.tipoContrato ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Horario:</strong>{" "}
                  {empleado.tipoHorario ?? "—"}
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
            Información de Días
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : resumenHoras ? (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Días laborados:</strong>{" "}
                    {resumenHoras.conteoHoras.diasLaborados || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Vacaciones:</strong>{" "}
                    {resumenHoras.conteoHoras.diasVacaciones || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Total horas trabajadas:</strong>{" "}
                    {resumenHoras.conteoHoras.totalHorasTrabajadas || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Horas laborables:</strong>{" "}
                    {resumenHoras.conteoHoras.totalHorasLaborables || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Diferencia:</strong>{" "}
                    {resumenHoras.desgloseIncidencias.diferencia || 0}
                  </Typography>
                </Grid>
              </Grid>
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
            Registro de Incidencias
          </Typography>
          <DesgloseIncidenciasComponent
            desglose={resumenHoras?.desgloseIncidencias || null}
            loading={loading}
          />
        </Box>

        {/* Deducciones (placeholder) */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Deducciones
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>{/* ... */}</Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default NominasDashboard;
