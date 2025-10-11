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

  const [fechaInicio, setFechaInicio] = React.useState<string>("");
  const [fechaFin, setFechaFin] = React.useState<string>("");
  const [tab, setTab] = React.useState(0);

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

  const { prorrateo, loading, error, refetch } = useProrrateo({
    empleadoId: empleado?.id || "",
    fechaInicio,
    fechaFin,
    enabled: !!empleado && rangoValido,
  });

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
              <TableCell>Código</TableCell>
              <TableCell align="right">Horas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((j) => (
              <TableRow key={`${j.jobId}-${j.codigoJob}`}>
                <TableCell>{j.nombreJob}</TableCell>
                <TableCell>{j.codigoJob}</TableCell>
                <TableCell align="right">
                  {Number(
                    j.horas
                      ? j.horas.toFixed(4)
                      : j.cantidadHoras?.toFixed(4) || 0
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

                <Box sx={{ mt: 2 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Resumen
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "repeat(2, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="body2">
                          Horas laborables:{" "}
                          {prorrateo.cantidadHoras.totalHorasLaborables || 0}
                        </Typography>
                        <Typography variant="body2">
                          Vacaciones (h):{" "}
                          {prorrateo.cantidadHoras.vacacionesHoras || 0}
                        </Typography>
                        <Typography variant="body2">
                          Permiso c/sueldo (h):{" "}
                          {prorrateo.cantidadHoras.permisoConSueldoHoras || 0}
                        </Typography>
                        <Typography variant="body2">
                          Permiso s/sueldo (h):{" "}
                          {prorrateo.cantidadHoras.permisoSinSueldoHoras || 0}
                        </Typography>
                        <Typography variant="body2">
                          Inasistencias (h):{" "}
                          {prorrateo.cantidadHoras.inasistenciasHoras || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2">
                          Deducción ISR:{" "}
                          {prorrateo.cantidadHoras.deduccionesISR || 0}
                        </Typography>
                        <Typography variant="body2">
                          Deducción RAP:{" "}
                          {prorrateo.cantidadHoras.deduccionesRAP || 0}
                        </Typography>
                        <Typography variant="body2">
                          Deducción Comida:{" "}
                          {prorrateo.cantidadHoras.deduccionesComida || 0}
                        </Typography>
                        <Typography variant="body2">
                          Deducción IHSS:{" "}
                          {prorrateo.cantidadHoras.deduccionesIHSS || 0}
                        </Typography>
                        <Typography variant="body2">
                          Préstamo: {prorrateo.cantidadHoras.Prestamo || 0}
                        </Typography>
                        <Typography variant="body2">
                          Total: {prorrateo.cantidadHoras.Total || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
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
  );
};

export default ProrrateoDashboard;
