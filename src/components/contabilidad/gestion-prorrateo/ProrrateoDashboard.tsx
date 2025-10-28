import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Container,
  IconButton,
  FormControl,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { Empleado } from "../../../services/empleadoService";
import type { EmpleadoIndexItem, LayoutOutletCtx } from "../../Layout";
import { useProrrateo } from "../../../hooks/useProrrateo";
import {
  listarNominasResumenPorEmpleado,
  type NominaResumen,
} from "../../../services/nominaService";
import NominaService, { type NominaDto } from "../../../services/nominaService";
import EmpleadoService from "../../../services/empleadoService";

interface ProrrateoDashboardProps {
  empleado?: Empleado;
  empleadosIndex?: EmpleadoIndexItem[];
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const DEBUG = false;

const ProrrateoDashboard: React.FC<ProrrateoDashboardProps> = ({
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

  const { selectedEmpresaId, searchTerm } = location.state ?? {};

  const goBackToList = () => {
    navigate("/contabilidad/prorrateo", {
      state: {
        selectedEmpresaId,
        searchTerm,
      },
    });
  };

  const empleadoInicial =
    empleadoProp ?? selectedEmpleado ?? location?.state?.empleado ?? null;

  const indiceEntrante: EmpleadoIndexItem[] =
    empleadosIndexProp ??
    empleadosIndexCtx ??
    location?.state?.empleadosIndex ??
    [];

  const [empleado, setEmpleado] = React.useState<Empleado | null>(
    empleadoInicial
  );

  const empleadosIndex: EmpleadoIndexItem[] = React.useMemo(
    () => indiceEntrante ?? [],
    [indiceEntrante]
  );

  // intervalos locales eliminados: ahora todo se carga desde backend

  const [intervaloSeleccionado, setIntervaloSeleccionado] =
    React.useState<string>("");
  const [nominasResumen, setNominasResumen] = React.useState<NominaResumen[]>(
    []
  );

  const [fechaInicio, setFechaInicio] = React.useState<string>("");
  const [fechaFin, setFechaFin] = React.useState<string>("");
  const [nominaSeleccionada, setNominaSeleccionada] =
    React.useState<NominaDto | null>(null);
  const [tab, setTab] = React.useState(0);

  // Modal de comentarios por job
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalJobTitle, setModalJobTitle] = React.useState<string>("");
  const [modalComments, setModalComments] = React.useState<string[]>([]);

  // Deducciones provistas por nómina seleccionada (solo lectura)

  const handleOpenComentarios = (jobTitle: string, comments: string[]) => {
    setModalJobTitle(jobTitle || "Comentarios");
    setModalComments(comments || []);
    setModalOpen(true);
  };
  const handleCloseComentarios = () => setModalOpen(false);

  // Calcular total de deducciones (desde nomina seleccionada)
  const totalDeducciones = React.useMemo(() => {
    if (nominaSeleccionada?.totalDeducciones != null) {
      return nominaSeleccionada.totalDeducciones;
    }
    const dIHSS = nominaSeleccionada?.deduccionIHSS || 0;
    const dISR = nominaSeleccionada?.deduccionISR || 0;
    const dRAP = nominaSeleccionada?.deduccionRAP || 0;
    const dComida = nominaSeleccionada?.deduccionAlimentacion || 0;
    const dPrestamo = nominaSeleccionada?.cobroPrestamo || 0;
    const dOtros = nominaSeleccionada?.otros || 0;
    const dImpuestoVecinal = nominaSeleccionada?.impuestoVecinal || 0;
    return (
      dIHSS + dISR + dRAP + dComida + dPrestamo + dOtros + dImpuestoVecinal
    );
  }, [nominaSeleccionada]);

  const fetchNominaPorPeriodo = React.useCallback(
    async (ini: string, fin: string) => {
      try {
        const match = nominasResumen.find(
          (n) =>
            (n.fechaInicio || "").slice(0, 10) === ini &&
            (n.fechaFin || "").slice(0, 10) === fin
        );
        if (!match) {
          setNominaSeleccionada(null);
          return;
        }
        const nomina = await NominaService.getById(match.id);
        setNominaSeleccionada(nomina || null);
      } catch (e) {
        console.error(
          "[ProrrateoDashboard] Error obteniendo nómina por ID:",
          e
        );
        setNominaSeleccionada(null);
      }
    },
    [nominasResumen]
  );

  React.useEffect(() => {
    if (!intervaloSeleccionado && nominasResumen.length > 0) {
      const primero = nominasResumen[0];
      const ini = (primero.fechaInicio || "").slice(0, 10);
      const fin = (primero.fechaFin || "").slice(0, 10);
      setIntervaloSeleccionado(`${ini}_${fin}`);
      setFechaInicio(ini);
      setFechaFin(fin);
      fetchNominaPorPeriodo(ini, fin);
    }
  }, [nominasResumen, intervaloSeleccionado, fetchNominaPorPeriodo]);

  const rangoValido =
    !!fechaInicio && !!fechaFin && new Date(fechaFin) >= new Date(fechaInicio);

  const handleIntervaloChange = (event: any) => {
    const valor = event.target.value;
    setIntervaloSeleccionado(valor);

    if (valor) {
      const [inicio, fin] = valor.split("_");
      setFechaInicio((inicio || "").slice(0, 10));
      setFechaFin((fin || "").slice(0, 10));
      const ini = (inicio || "").slice(0, 10);
      const fn = (fin || "").slice(0, 10);
      fetchNominaPorPeriodo(ini, fn);
    } else {
      setFechaInicio("");
      setFechaFin("");
      setNominaSeleccionada(null);
    }
  };

  React.useEffect(() => {
    (async () => {
      if (!empleado?.id) return;
      try {
        const lista = await listarNominasResumenPorEmpleado(
          Number(empleado.id)
        );
        setNominasResumen(lista || []);
      } catch (e) {
        console.error("[ProrrateoDashboard] Error listando nóminas:", e);
        setNominasResumen([]);
      }
    })();
  }, [empleado?.id]);

  const { prorrateo, loading, error, refetch } = useProrrateo({
    empleadoId: empleado?.id || "",
    fechaInicio,
    fechaFin,
    enabled: !!empleado && rangoValido,
  });

  // Ya no sincronizamos deducciones editables; vienen de nómina seleccionada

  React.useEffect(() => {
    if (empleado && rangoValido) {
      if (DEBUG)
        console.debug(
          "[ProrrateoDashboard] empleado cambió → refetch",
          empleado.id
        );
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleado?.id, rangoValido]);

  const eq = (a: any, b: any) =>
    a != null && b != null && String(a) === String(b);

  const splitNombre = (nombreCompleto?: string) => {
    const parts = (nombreCompleto || "").trim().split(/\s+/);
    const nombre = parts[0] || "";
    const apellido = parts.slice(1).join(" ");
    return { nombre, apellido };
  };

  const getCurrentIdx = React.useCallback(() => {
    if (!empleado || !empleadosIndex?.length) return -1;

    let i = empleadosIndex.findIndex((x) => eq(x.id, (empleado as any).id));
    if (i >= 0) return i;

    if ((empleado as any).codigo) {
      i = empleadosIndex.findIndex((x) =>
        x.codigo ? eq(x.codigo, (empleado as any).codigo) : false
      );
      if (i >= 0) return i;
    }

    const nombreCompletoActual = `${empleado.nombre ?? ""} ${
      empleado.apellido ?? ""
    }`.trim();
    i = empleadosIndex.findIndex(
      (x) => (x.nombreCompleto || "").trim() === nombreCompletoActual
    );

    return i;
  }, [empleado, empleadosIndex]);

  const idx = getCurrentIdx();
  const hayPrev = idx > 0;
  const hayNext = idx >= 0 && idx < empleadosIndex.length - 1;

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

  const cargarEmpleadoCompleto = React.useCallback(
    async (empleadoId: number) => {
      try {
        const empleadoCompleto = await EmpleadoService.getById(empleadoId);
        setEmpleado(empleadoCompleto);
      } catch (error) {
        console.error("[ProrrateoDashboard] Error al cargar empleado:", error);
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
    if (empleadosIndex?.length && hayPrev) {
      const prev = empleadosIndex[idx - 1];
      cargarEmpleadoCompleto(prev.id);
    } else if (onPrevious) {
      onPrevious();
    }
  };

  const goNext = () => {
    if (empleadosIndex?.length && hayNext) {
      const next = empleadosIndex[idx + 1];
      cargarEmpleadoCompleto(next.id);
    } else if (onNext) {
      onNext();
    }
  };

  if (!empleado) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            No hay colaborador seleccionado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona un colaborador desde la gestión de prorrateo.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/contabilidad/prorrateo")}
          >
            Ir a Gestión de Prorrateo
          </Button>
        </Box>
      </Container>
    );
  }

  const renderTabla = (titulo: string, items: any[]) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {titulo}
      </Typography>
      {items?.length ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell>Nombre del Job</TableCell>
              <TableCell align="right">Horas</TableCell>
              <TableCell align="center">Comentarios</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((j) => (
              <TableRow key={`${j.jobId}-${j.codigoJob}`}>
                <TableCell>{j.codigoJob}</TableCell>
                <TableCell>{j.nombreJob}</TableCell>
                <TableCell align="right">
                  {Number(
                    j.horas
                      ? j.horas.toFixed(4)
                      : j.cantidadHoras?.toFixed(4) || 0
                  )}
                </TableCell>
                <TableCell align="center">
                  {Array.isArray(j.comentarios) && j.comentarios.length > 0 ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleOpenComentarios(j.nombreJob, j.comentarios)
                      }
                    >
                      Ver comentarios ({j.comentarios.length})
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Sin datos
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <Container maxWidth="lg" sx={{ height: "100%", overflowY: "auto" }}>
        <Box sx={{ py: 4 }}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 4,
              background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
              color: "white",
              position: "relative",
            }}
          >
            <IconButton
              onClick={goBackToList}
              title="Volver a lista de colaboradores"
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 30,
                height: 30,
                zIndex: 2,
                color: "white",
                backgroundColor: "rgba(0,0,0,0.2)",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.32)" },
                boxShadow: 1,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 15 }} />
            </IconButton>

            <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
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
              >
                <NavigateBeforeIcon />
              </IconButton>

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
                    {nominasResumen.map((n) => (
                      <MenuItem
                        key={n.id}
                        value={`${n.fechaInicio}_${n.fechaFin}`}
                      >
                        {n.nombrePeriodoNomina}
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

              <IconButton
                onClick={goNext}
                disabled={!(empleadosIndex?.length ? hayNext : hasNext)}
                sx={{
                  color: "white",
                  opacity: (empleadosIndex?.length ? hayNext : hasNext)
                    ? 1
                    : 0.5,
                  width: 20,
                  height: 48,
                  "& .MuiSvgIcon-root": { fontSize: 80 },
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <NavigateNextIcon />
              </IconButton>
            </Box>

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
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error.response?.data?.validationErrors ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    No se puede procesar el prorrateo
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
                </Box>
              ) : (
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

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Prorrateo de Horas por Job
            </Typography>
            <Paper sx={{ p: 3, mt: 2 }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : prorrateo ? (
                <>
                  {/* Resumen primero */}
                  <Box sx={{ mb: 3 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Resumen
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(3, 1fr)",
                          },
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Table
                            size="small"
                            sx={{
                              width: "auto",
                              "& .MuiTableCell-root": { py: 0.75, px: 0.75 },
                            }}
                          >
                            <TableBody>
                              <TableRow>
                                <TableCell>Horas laborables</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {prorrateo.cantidadHoras
                                    .totalHorasLaborables || 0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Vacaciones (h)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {prorrateo.cantidadHoras.vacacionesHoras || 0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Permiso c/sueldo (h)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {prorrateo.cantidadHoras
                                    .permisoConSueldoHoras || 0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Permiso s/sueldo (h)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {prorrateo.cantidadHoras
                                    .permisoSinSueldoHoras || 0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Inasistencias (h)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {prorrateo.cantidadHoras.inasistenciasHoras ||
                                    0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Días laborados</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {nominaSeleccionada?.diasLaborados ?? 0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Días vacaciones</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {nominaSeleccionada?.diasVacaciones ?? 0}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Días incapacidad</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                  {nominaSeleccionada?.diasIncapacidad ?? 0}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Box>
                        <Box>
                          <Table
                            size="small"
                            sx={{
                              width: "auto",
                              "& .MuiTableCell-root": { py: 0.75, px: 0.75 },
                            }}
                          >
                            <TableBody>
                              <TableRow>
                                <TableCell>Empresa</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {nominaSeleccionada?.empresaId ?? "—"}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Deducción IHSS</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.deduccionIHSS ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Deducción ISR</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.deduccionISR ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Deducción RAP</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.deduccionRAP ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Deducción Comida</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.deduccionAlimentacion ??
                                    0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Impuesto Vecinal</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.impuestoVecinal ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Otros</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.otros ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Préstamo</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.cobroPrestamo ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <strong>Total deducciones</strong>
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  <strong>{`${totalDeducciones} L`}</strong>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Box>
                        <Box>
                          <Table
                            size="small"
                            sx={{
                              width: "auto",
                              "& .MuiTableCell-root": { py: 0.25, px: 0.75 },
                            }}
                          >
                            <TableBody>
                              <TableRow>
                                <TableCell>Sueldo mensual</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.sueldoMensual ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Monto días laborados</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.montoDiasLaborados ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Monto vacaciones</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.montoVacaciones ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  Monto incapacidad (empresa)
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.montoIncapacidadCubreEmpresa ??
                                    0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  Monto permisos justificados
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.montoPermisosJustificados ??
                                    0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Horas extra 25% (monto)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.montoHoras25 ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Horas extra 50% (monto)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.montoHoras50 ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Horas extra 75% (monto)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.montoHoras75 ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Horas extra 100% (monto)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.montoHoras100 ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Ajuste</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${nominaSeleccionada?.ajuste ?? 0} L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Subtotal quincena</TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  {`${
                                    nominaSeleccionada?.subtotalQuincena ?? 0
                                  } L`}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <strong>Total percepciones</strong>
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 120 }}>
                                  <strong>{`${
                                    nominaSeleccionada?.totalPercepciones ?? 0
                                  } L`}</strong>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Box>
                      </Box>
                    </Paper>
                  </Box>

                  {/* Tabs de conteo por horas */}
                  <Paper sx={{ p: 2 }}>
                    <Tabs
                      value={tab}
                      onChange={(_, v) => setTab(v)}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      <Tab label="Normal" />
                      <Tab label="25%" />
                      <Tab label="50%" />
                      <Tab label="75%" />
                      <Tab label="100%" />
                    </Tabs>
                    <Box sx={{ p: 2 }}>
                      {tab === 0 &&
                        renderTabla(
                          "Horas Normales",
                          prorrateo.cantidadHoras.normal
                        )}
                      {tab === 1 &&
                        renderTabla("Horas 25%", prorrateo.cantidadHoras.p25)}
                      {tab === 2 &&
                        renderTabla("Horas 50%", prorrateo.cantidadHoras.p50)}
                      {tab === 3 &&
                        renderTabla("Horas 75%", prorrateo.cantidadHoras.p75)}
                      {tab === 4 &&
                        renderTabla("Horas 100%", prorrateo.cantidadHoras.p100)}
                    </Box>
                  </Paper>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  Selecciona un período de nómina del selector y presiona
                  "Aplicar" para ver la información.
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Modal de comentarios */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseComentarios}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{modalJobTitle}</DialogTitle>
        <DialogContent dividers>
          {modalComments.length ? (
            <List dense>
              {modalComments.map((c, idx) => (
                <ListItem key={idx} alignItems="flex-start">
                  <ListItemText primary={c} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No hay comentarios registrados para este job.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProrrateoDashboard;
