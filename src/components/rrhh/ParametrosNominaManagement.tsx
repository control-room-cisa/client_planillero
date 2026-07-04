import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { GlobalConfigService } from "../../services/globalConfigService";
import { RangosFechasAlimentacionService } from "../../services/rangosFechasAlimentacionService";
import type { RangoFechasAlimentacionDto } from "../../services/rangosFechasAlimentacionService";
import { RANGOS_ALIMENTACION_PAGE_SIZE } from "../../services/rangosFechasAlimentacionService";
import {
  TechoIhssService,
  TECHO_IHSS_PAGE_SIZE,
  type TechoIhssDto,
} from "../../services/techoIhssService";
import ConfirmDialog from "../common/ConfirmDialog";
import { registroFechaToYmdSafe, ymdInTimeZone } from "../../utils/dateTime";

const ANO_MIN_ALIMENTACION = 2025;

const MESES_NOMBRE = [
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
] as const;

function construirCodigoNomina(
  anio: number,
  mes: number,
  periodo: "A" | "B",
): string {
  return `${anio}${String(mes).padStart(2, "0")}${periodo}`;
}

function mensajeErrorApi(e: unknown, fallback: string) {
  const x = e as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return x?.response?.data?.message || x?.message || fallback;
}

function normalizarYmdOrEmpty(fecha?: string | null): string {
  return registroFechaToYmdSafe(fecha) ?? "";
}

function formatMonto(valor: number): string {
  return new Intl.NumberFormat("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatCreatedAt(iso: string): string {
  const ymd = normalizarYmdOrEmpty(iso);
  if (ymd) return ymd;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-HN");
}

function parseMonto(s: string): number {
  const n = Number(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

const ParametrosNominaManagement: React.FC = () => {
  const hoyYmd = React.useMemo(() => ymdInTimeZone(new Date()), []);
  const [anioCalendario, mesCalendario] = React.useMemo(() => {
    const [y, m] = hoyYmd.split("-").map(Number);
    return [y, m];
  }, [hoyYmd]);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadedKeys, setLoadedKeys] = React.useState<{
    deduccionIhssFija: boolean;
  }>({ deduccionIhssFija: false });

  const [tabActiva, setTabActiva] = React.useState<
    "alimentacion" | "ihss" | "techoIhss"
  >("alimentacion");

  const [anioAlim, setAnioAlim] = React.useState<number>(anioCalendario);
  const [mesAlim, setMesAlim] = React.useState<number>(mesCalendario);
  const [periodoAlim, setPeriodoAlim] = React.useState<"A" | "B">("A");

  const [rangos, setRangos] = React.useState<RangoFechasAlimentacionDto[]>([]);
  const [rangosPage, setRangosPage] = React.useState(0);
  const [rangosTotal, setRangosTotal] = React.useState(0);
  const [codigoTieneRango, setCodigoTieneRango] = React.useState(false);
  const [idPermiteEdicion, setIdPermiteEdicion] = React.useState<number | null>(
    null,
  );
  const [listRangosLoading, setListRangosLoading] = React.useState(false);
  const [nuevoInicio, setNuevoInicio] = React.useState<string>("");
  const [nuevoFin, setNuevoFin] = React.useState<string>("");
  const [edicion, setEdicion] =
    React.useState<RangoFechasAlimentacionDto | null>(null);

  const [deduccionIhssFija, setDeduccionIhssFija] = React.useState<string>("");

  const [techosIhss, setTechosIhss] = React.useState<TechoIhssDto[]>([]);
  const [techosIhssPage, setTechosIhssPage] = React.useState(0);
  const [techosIhssTotal, setTechosIhssTotal] = React.useState(0);
  const [listTechosLoading, setListTechosLoading] = React.useState(false);
  const [nuevoTechoInicio, setNuevoTechoInicio] = React.useState("");
  const [nuevoTechoFin, setNuevoTechoFin] = React.useState("");
  const [nuevoTechoMonto, setNuevoTechoMonto] = React.useState("");
  const [edicionTecho, setEdicionTecho] = React.useState<TechoIhssDto | null>(
    null,
  );
  const [confirmDeleteTecho, setConfirmDeleteTecho] = React.useState<{
    open: boolean;
    id: number | null;
  }>({ open: false, id: null });

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const codigoNomina = React.useMemo(
    () => construirCodigoNomina(anioAlim, mesAlim, periodoAlim),
    [anioAlim, mesAlim, periodoAlim],
  );

  const aniosSelect = React.useMemo(() => {
    const out: number[] = [];
    for (let y = anioCalendario; y >= ANO_MIN_ALIMENTACION; y--) out.push(y);
    return out;
  }, [anioCalendario]);

  const mesesDisponibles = React.useMemo(() => {
    if (anioAlim === anioCalendario) {
      return Array.from({ length: mesCalendario }, (_, i) => mesCalendario - i);
    }
    return Array.from({ length: 12 }, (_, i) => 12 - i);
  }, [anioAlim, anioCalendario, mesCalendario]);

  const showToast = React.useCallback(
    (message: string, severity: "success" | "error" = "success") =>
      setSnackbar({ open: true, message, severity }),
    [],
  );

  const cargarIhss = React.useCallback(async () => {
    setLoading(true);
    try {
      const ded = await GlobalConfigService.get("DEDUCCION_IHSS_FIJA");
      setLoadedKeys({
        deduccionIhssFija: Boolean(ded),
      });
      setDeduccionIhssFija(ded?.value ?? "595.16");
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error cargando parámetros"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const recargarRangos = React.useCallback(
    async (page: number) => {
      if (tabActiva !== "alimentacion") return;
      setListRangosLoading(true);
      try {
        const result = await RangosFechasAlimentacionService.list(page);
        setRangos(
          result.items.map((r) => ({
            ...r,
            fechaInicio: normalizarYmdOrEmpty(r.fechaInicio),
            fechaFin: normalizarYmdOrEmpty(r.fechaFin),
          })),
        );
        setRangosTotal(result.total);
        setRangosPage(result.page);
        setIdPermiteEdicion(result.idPermiteEdicion);
      } catch (e: unknown) {
        setRangos([]);
        setRangosTotal(0);
        setIdPermiteEdicion(null);
        showToast(
          mensajeErrorApi(e, "Error al cargar rangos de alimentación"),
          "error",
        );
      } finally {
        setListRangosLoading(false);
      }
    },
    [tabActiva, showToast],
  );

  const verificarCodigoTieneRango = React.useCallback(async () => {
    if (tabActiva !== "alimentacion") return;
    try {
      const { items } =
        await RangosFechasAlimentacionService.listByCodigo(codigoNomina);
      setCodigoTieneRango(items.length > 0);
    } catch {
      setCodigoTieneRango(false);
    }
  }, [tabActiva, codigoNomina]);

  const recargarTechosIhss = React.useCallback(
    async (page: number) => {
      if (tabActiva !== "techoIhss") return;
      setListTechosLoading(true);
      try {
        const result = await TechoIhssService.list(page);
        setTechosIhss(
          result.items.map((t) => ({
            ...t,
            fechaInicio: normalizarYmdOrEmpty(t.fechaInicio),
            fechaFin: normalizarYmdOrEmpty(t.fechaFin),
          })),
        );
        setTechosIhssTotal(result.total);
        setTechosIhssPage(result.page);
      } catch (e: unknown) {
        setTechosIhss([]);
        setTechosIhssTotal(0);
        showToast(mensajeErrorApi(e, "Error al cargar techos IHSS"), "error");
      } finally {
        setListTechosLoading(false);
      }
    },
    [tabActiva, showToast],
  );

  React.useEffect(() => {
    void cargarIhss();
  }, [cargarIhss]);

  React.useEffect(() => {
    if (tabActiva !== "alimentacion") return;
    void recargarRangos(rangosPage);
  }, [tabActiva, rangosPage, recargarRangos]);

  React.useEffect(() => {
    void verificarCodigoTieneRango();
  }, [verificarCodigoTieneRango]);

  React.useEffect(() => {
    if (tabActiva !== "techoIhss") return;
    void recargarTechosIhss(techosIhssPage);
  }, [tabActiva, techosIhssPage, recargarTechosIhss]);

  const parseNum = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const agregarRango = async () => {
    const inicio = normalizarYmdOrEmpty(nuevoInicio);
    const fin = normalizarYmdOrEmpty(nuevoFin);
    if (!inicio || !fin) {
      showToast("Indica fecha de inicio y fecha de fin", "error");
      return;
    }
    if (inicio > fin) {
      showToast(
        "La fecha de inicio no puede ser mayor que la fecha de fin",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      await RangosFechasAlimentacionService.create({
        codigoNomina,
        fechaInicio: inicio,
        fechaFin: fin,
      });
      setNuevoInicio("");
      setNuevoFin("");
      showToast("Rango agregado", "success");
      setRangosPage(0);
      await recargarRangos(0);
      await verificarCodigoTieneRango();
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al agregar rango"), "error");
    } finally {
      setSaving(false);
    }
  };

  const guardarEdicion = async () => {
    if (!edicion) return;
    const inicio = normalizarYmdOrEmpty(edicion.fechaInicio);
    const fin = normalizarYmdOrEmpty(edicion.fechaFin);
    if (!inicio || !fin) {
      showToast("Indica ambas fechas", "error");
      return;
    }
    if (inicio > fin) {
      showToast(
        "La fecha de inicio no puede ser mayor que la fecha de fin",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      await RangosFechasAlimentacionService.update(edicion.id, {
        fechaInicio: inicio,
        fechaFin: fin,
      });
      setEdicion(null);
      showToast("Rango actualizado", "success");
      await recargarRangos(rangosPage);
      await verificarCodigoTieneRango();
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al actualizar"), "error");
    } finally {
      setSaving(false);
    }
  };

  const agregarTechoIhss = async () => {
    const inicio = normalizarYmdOrEmpty(nuevoTechoInicio);
    const fin = normalizarYmdOrEmpty(nuevoTechoFin);
    const monto = parseMonto(nuevoTechoMonto);
    if (!inicio || !fin) {
      showToast("Indica fecha de inicio y fecha de fin", "error");
      return;
    }
    if (inicio > fin) {
      showToast(
        "La fecha de inicio no puede ser mayor que la fecha de fin",
        "error",
      );
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      showToast("Indica un monto válido mayor a 0", "error");
      return;
    }
    setSaving(true);
    try {
      await TechoIhssService.create({
        fechaInicio: inicio,
        fechaFin: fin,
        monto,
      });
      setNuevoTechoInicio("");
      setNuevoTechoFin("");
      setNuevoTechoMonto("");
      showToast("Techo IHSS agregado", "success");
      setTechosIhssPage(0);
      await recargarTechosIhss(0);
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al agregar techo IHSS"), "error");
    } finally {
      setSaving(false);
    }
  };

  const guardarEdicionTecho = async () => {
    if (!edicionTecho) return;
    const inicio = normalizarYmdOrEmpty(edicionTecho.fechaInicio);
    const fin = normalizarYmdOrEmpty(edicionTecho.fechaFin);
    const monto = parseMonto(String(edicionTecho.monto));
    if (!inicio || !fin) {
      showToast("Indica ambas fechas", "error");
      return;
    }
    if (inicio > fin) {
      showToast(
        "La fecha de inicio no puede ser mayor que la fecha de fin",
        "error",
      );
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      showToast("Indica un monto válido mayor a 0", "error");
      return;
    }
    setSaving(true);
    try {
      await TechoIhssService.update(edicionTecho.id, {
        fechaInicio: inicio,
        fechaFin: fin,
        monto,
      });
      setEdicionTecho(null);
      showToast("Techo IHSS actualizado", "success");
      await recargarTechosIhss(techosIhssPage);
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al actualizar techo IHSS"), "error");
    } finally {
      setSaving(false);
    }
  };

  const eliminarTechoIhss = async () => {
    if (confirmDeleteTecho.id == null) return;
    setSaving(true);
    try {
      await TechoIhssService.delete(confirmDeleteTecho.id);
      setConfirmDeleteTecho({ open: false, id: null });
      showToast("Techo IHSS eliminado", "success");
      await recargarTechosIhss(techosIhssPage);
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al eliminar techo IHSS"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIhss = async () => {
    const ded = parseNum(deduccionIhssFija);
    if (!Number.isFinite(ded) || ded < 0) {
      showToast("Deducción fija IHSS inválida", "error");
      return;
    }
    setSaving(true);
    try {
      await GlobalConfigService.upsert({
        key: "DEDUCCION_IHSS_FIJA",
        value: String(ded),
        description: "Deducción fija IHSS",
      });
      setLoadedKeys((prev) => ({
        ...prev,
        deduccionIhssFija: true,
      }));
      showToast("Deducción IHSS guardada", "success");
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error guardando parámetros"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ flexShrink: 0 }}>
        Parámetros de Nómina
      </Typography>

      <Paper
        sx={{
          p: 2,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ maxWidth: 900 }}>
            <Typography variant="body2" color="text.secondary">
              Estos valores afectan cálculos en el módulo de nómina.
            </Typography>
            <Tabs
              value={tabActiva}
              onChange={(_, value: "alimentacion" | "ihss" | "techoIhss") =>
                setTabActiva(value)
              }
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab label="Alimentación" value="alimentacion" />
              <Tab label="IHSS" value="ihss" />
              <Tab label="Techo IHSS" value="techoIhss" />
            </Tabs>

            <Divider />

            {tabActiva === "alimentacion" ? (
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Intervalo de días a partir de los cuales se obtendrán
                  deducciones de alimentos según nómina.
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel id="anio-nomina-label">Año</InputLabel>
                    <Select
                      labelId="anio-nomina-label"
                      label="Año"
                      value={anioAlim}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        setAnioAlim(y);
                        if (y === anioCalendario) {
                          setMesAlim(mesCalendario);
                        } else {
                          setMesAlim(12);
                        }
                      }}
                    >
                      {aniosSelect.map((y) => (
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="mes-nomina-label">Mes</InputLabel>
                    <Select
                      labelId="mes-nomina-label"
                      label="Mes"
                      value={mesAlim}
                      onChange={(e) => setMesAlim(Number(e.target.value))}
                    >
                      {mesesDisponibles.map((m) => (
                        <MenuItem key={m} value={m}>
                          {MESES_NOMBRE[m - 1]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id="periodo-nomina-label">Quincena</InputLabel>
                    <Select
                      labelId="periodo-nomina-label"
                      label="Quincena"
                      value={periodoAlim}
                      onChange={(e) =>
                        setPeriodoAlim(e.target.value as "A" | "B")
                      }
                    >
                      <MenuItem value="A">A — Primera</MenuItem>
                      <MenuItem value="B">B — Segunda</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Código de nómina"
                    value={codigoNomina}
                    disabled
                    helperText="Año + mes + quincena (A o B)"
                    sx={{ minWidth: 240 }}
                  />
                </Box>

                <Typography variant="subtitle2" sx={{ pt: 1 }}>
                  Nuevo rango (este período)
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                  }}
                >
                  <TextField
                    label="Fecha de inicio"
                    type="date"
                    value={nuevoInicio}
                    onChange={(e) => setNuevoInicio(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                    sx={{ minWidth: 200 }}
                  />
                  <TextField
                    label="Fecha de fin"
                    type="date"
                    value={nuevoFin}
                    onChange={(e) => setNuevoFin(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                    sx={{ minWidth: 200 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={agregarRango}
                    disabled={saving || listRangosLoading || codigoTieneRango}
                  >
                    Agregar rango
                  </Button>
                </Box>
                {codigoTieneRango && (
                  <Typography variant="caption" color="text.secondary">
                    Ya existe un rango para este código. No se pueden eliminar
                    registros; solo se puede editar el rango más reciente.
                  </Typography>
                )}

                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ maxWidth: "100%" }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Código nómina</TableCell>
                        <TableCell>Fecha inicio</TableCell>
                        <TableCell>Fecha fin</TableCell>
                        <TableCell align="right" width={100}>
                          Editar
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {listRangosLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <CircularProgress size={24} />
                          </TableCell>
                        </TableRow>
                      ) : rangos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                            No hay rangos de alimentación registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rangos.map((r) => {
                          const puedeEditar =
                            idPermiteEdicion != null &&
                            r.id === idPermiteEdicion;
                          return (
                            <TableRow key={r.id}>
                              <TableCell>{r.codigoNomina}</TableCell>
                              <TableCell>{r.fechaInicio}</TableCell>
                              <TableCell>{r.fechaFin}</TableCell>
                              <TableCell align="right">
                                {puedeEditar ? (
                                  <IconButton
                                    size="small"
                                    onClick={() => setEdicion({ ...r })}
                                    aria-label="Editar rango"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={rangosTotal}
                    page={rangosPage}
                    onPageChange={(_, newPage) => setRangosPage(newPage)}
                    rowsPerPage={RANGOS_ALIMENTACION_PAGE_SIZE}
                    rowsPerPageOptions={[RANGOS_ALIMENTACION_PAGE_SIZE]}
                    labelRowsPerPage="Filas por página"
                    labelDisplayedRows={({ from, to, count }) =>
                      `${from}–${to} de ${count !== -1 ? count : to}`
                    }
                  />
                </TableContainer>
              </Stack>
            ) : tabActiva === "ihss" ? (
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Configura la deducción fija IHSS usada en los cálculos de
                  nómina.
                  {!loadedKeys.deduccionIhssFija
                    ? " (aún no existe, se creará al guardar)"
                    : ""}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <TextField
                    label="Deducción fija IHSS"
                    value={deduccionIhssFija}
                    onChange={(e) => setDeduccionIhssFija(e.target.value)}
                    helperText="Ej: 595.16"
                    sx={{ minWidth: 280, flex: "1 1 360px" }}
                  />
                </Box>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Monto del techo IHSS vigente por rango de fechas. Los rangos
                  no pueden traslaparse entre sí.
                </Typography>

                <Typography variant="subtitle2" sx={{ pt: 1 }}>
                  Nuevo techo IHSS
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                  }}
                >
                  <TextField
                    label="Fecha de inicio"
                    type="date"
                    value={nuevoTechoInicio}
                    onChange={(e) => setNuevoTechoInicio(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                    sx={{ minWidth: 200 }}
                  />
                  <TextField
                    label="Fecha de fin"
                    type="date"
                    value={nuevoTechoFin}
                    onChange={(e) => setNuevoTechoFin(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                    sx={{ minWidth: 200 }}
                  />
                  <TextField
                    label="Monto"
                    type="text"
                    inputMode="decimal"
                    value={nuevoTechoMonto}
                    onChange={(e) => setNuevoTechoMonto(e.target.value)}
                    placeholder="Ej: 11903.13"
                    disabled={saving}
                    sx={{ minWidth: 180 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={agregarTechoIhss}
                    disabled={saving || listTechosLoading}
                  >
                    Agregar
                  </Button>
                </Box>

                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ maxWidth: "100%" }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Creado</TableCell>
                        <TableCell>Fecha inicio</TableCell>
                        <TableCell>Fecha fin</TableCell>
                        <TableCell align="right">Monto</TableCell>
                        <TableCell align="right" width={120}>
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {listTechosLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <CircularProgress size={24} />
                          </TableCell>
                        </TableRow>
                      ) : techosIhss.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                            No hay techos IHSS registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        techosIhss.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              {formatCreatedAt(t.createdAt)}
                            </TableCell>
                            <TableCell>{t.fechaInicio}</TableCell>
                            <TableCell>{t.fechaFin}</TableCell>
                            <TableCell align="right">
                              {formatMonto(t.monto)}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => setEdicionTecho({ ...t })}
                                aria-label="Editar techo IHSS"
                                disabled={saving}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setConfirmDeleteTecho({
                                    open: true,
                                    id: t.id,
                                  })
                                }
                                aria-label="Eliminar techo IHSS"
                                disabled={saving}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={techosIhssTotal}
                    page={techosIhssPage}
                    onPageChange={(_, newPage) => setTechosIhssPage(newPage)}
                    rowsPerPage={TECHO_IHSS_PAGE_SIZE}
                    rowsPerPageOptions={[TECHO_IHSS_PAGE_SIZE]}
                    labelRowsPerPage="Filas por página"
                    labelDisplayedRows={({ from, to, count }) =>
                      `${from}–${to} de ${count !== -1 ? count : to}`
                    }
                  />
                </TableContainer>
              </Stack>
            )}

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {tabActiva === "ihss" && (
                <Button
                  variant="contained"
                  onClick={handleSaveIhss}
                  disabled={saving}
                  sx={{ minWidth: 120 }}
                  endIcon={
                    saving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                >
                  Guardar
                </Button>
              )}
            </Box>
          </Stack>
        )}
      </Paper>

      <Dialog
        open={Boolean(edicion)}
        onClose={() => !saving && setEdicion(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Editar rango</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Fecha de inicio"
              type="date"
              value={edicion?.fechaInicio ?? ""}
              onChange={(e) =>
                setEdicion((prev) =>
                  prev ? { ...prev, fechaInicio: e.target.value } : null,
                )
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Fecha de fin"
              type="date"
              value={edicion?.fechaFin ?? ""}
              onChange={(e) =>
                setEdicion((prev) =>
                  prev ? { ...prev, fechaFin: e.target.value } : null,
                )
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdicion(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={guardarEdicion}
            variant="contained"
            disabled={saving}
            endIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(edicionTecho)}
        onClose={() => !saving && setEdicionTecho(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Editar techo IHSS</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Fecha de inicio"
              type="date"
              value={edicionTecho?.fechaInicio ?? ""}
              onChange={(e) =>
                setEdicionTecho((prev) =>
                  prev ? { ...prev, fechaInicio: e.target.value } : null,
                )
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Fecha de fin"
              type="date"
              value={edicionTecho?.fechaFin ?? ""}
              onChange={(e) =>
                setEdicionTecho((prev) =>
                  prev ? { ...prev, fechaFin: e.target.value } : null,
                )
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Monto"
              type="text"
              inputMode="decimal"
              value={
                edicionTecho != null ? String(edicionTecho.monto) : ""
              }
              onChange={(e) =>
                setEdicionTecho((prev) =>
                  prev
                    ? {
                        ...prev,
                        monto: parseMonto(e.target.value) || prev.monto,
                      }
                    : null,
                )
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdicionTecho(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={guardarEdicionTecho}
            variant="contained"
            disabled={saving}
            endIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteTecho.open}
        title="Eliminar techo IHSS"
        message="¿Eliminar este registro de techo IHSS? Esta acción no se puede deshacer."
        onConfirm={eliminarTechoIhss}
        onCancel={() =>
          !saving && setConfirmDeleteTecho({ open: false, id: null })
        }
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParametrosNominaManagement;
