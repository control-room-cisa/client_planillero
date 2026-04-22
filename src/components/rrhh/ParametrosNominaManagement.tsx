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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { GlobalConfigService } from "../../services/globalConfigService";
import { RangosFechasAlimentacionService } from "../../services/rangosFechasAlimentacionService";
import type { RangoFechasAlimentacionDto } from "../../services/rangosFechasAlimentacionService";

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
  const x = e as { response?: { data?: { message?: string } }; message?: string };
  return x?.response?.data?.message || x?.message || fallback;
}

const ParametrosNominaManagement: React.FC = () => {
  const ahora = React.useMemo(() => new Date(), []);
  const anioCalendario = ahora.getFullYear();
  const mesCalendario = ahora.getMonth() + 1;

  const [loading, setLoading] = React.useState(true);
  const [reloading, setReloading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadedKeys, setLoadedKeys] = React.useState<{
    pisoIhss: boolean;
    deduccionIhssFija: boolean;
  }>({ pisoIhss: false, deduccionIhssFija: false });

  const [tabActiva, setTabActiva] = React.useState<"alimentacion" | "ihss">(
    "alimentacion",
  );

  const [anioAlim, setAnioAlim] = React.useState<number>(anioCalendario);
  const [mesAlim, setMesAlim] = React.useState<number>(mesCalendario);
  const [periodoAlim, setPeriodoAlim] = React.useState<"A" | "B">("A");

  const [rangos, setRangos] = React.useState<RangoFechasAlimentacionDto[]>([]);
  const [idPermiteEdicion, setIdPermiteEdicion] = React.useState<number | null>(
    null,
  );
  const [listRangosLoading, setListRangosLoading] = React.useState(false);
  const [nuevoInicio, setNuevoInicio] = React.useState<string>("");
  const [nuevoFin, setNuevoFin] = React.useState<string>("");
  const [edicion, setEdicion] = React.useState<RangoFechasAlimentacionDto | null>(
    null,
  );

  const [pisoIhss, setPisoIhss] = React.useState<string>("");
  const [deduccionIhssFija, setDeduccionIhssFija] = React.useState<string>("");

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
    for (let y = ANO_MIN_ALIMENTACION; y <= anioCalendario; y++) out.push(y);
    return out;
  }, [anioCalendario]);

  const mesesDisponibles = React.useMemo(() => {
    if (anioAlim === anioCalendario) {
      return [mesCalendario];
    }
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, [anioAlim, anioCalendario, mesCalendario]);

  const showToast = React.useCallback(
    (message: string, severity: "success" | "error" = "success") =>
      setSnackbar({ open: true, message, severity }),
    [],
  );

  const cargarIhss = React.useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "initial") setLoading(true);
      try {
        const [piso, ded] = await Promise.all([
          GlobalConfigService.get("PISO_IHSS"),
          GlobalConfigService.get("DEDUCCION_IHSS_FIJA"),
        ]);
        setLoadedKeys({
          pisoIhss: Boolean(piso),
          deduccionIhssFija: Boolean(ded),
        });
        setPisoIhss(piso?.value ?? "11903.13");
        setDeduccionIhssFija(ded?.value ?? "595.16");
      } catch (e: unknown) {
        showToast(mensajeErrorApi(e, "Error cargando parámetros"), "error");
      } finally {
        if (mode === "initial") setLoading(false);
      }
    },
    [showToast],
  );

  const recargarRangos = React.useCallback(async () => {
    if (tabActiva !== "alimentacion") return;
    setListRangosLoading(true);
    try {
      const { items, idPermiteEdicion: idEdit } =
        await RangosFechasAlimentacionService.listByCodigo(codigoNomina);
      setRangos(items);
      setIdPermiteEdicion(idEdit);
    } catch (e: unknown) {
      setRangos([]);
      setIdPermiteEdicion(null);
      showToast(
        mensajeErrorApi(e, "Error al cargar rangos de alimentación"),
        "error",
      );
    } finally {
      setListRangosLoading(false);
    }
  }, [tabActiva, codigoNomina, showToast]);

  React.useEffect(() => {
    void cargarIhss("initial");
  }, [cargarIhss]);

  React.useEffect(() => {
    void recargarRangos();
  }, [recargarRangos]);

  const parseNum = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const agregarRango = async () => {
    if (!nuevoInicio || !nuevoFin) {
      showToast("Indica fecha de inicio y fecha de fin", "error");
      return;
    }
    if (nuevoInicio > nuevoFin) {
      showToast("La fecha de inicio no puede ser mayor que la fecha de fin", "error");
      return;
    }
    setSaving(true);
    try {
      await RangosFechasAlimentacionService.create({
        codigoNomina,
        fechaInicio: nuevoInicio,
        fechaFin: nuevoFin,
      });
      setNuevoInicio("");
      setNuevoFin("");
      showToast("Rango agregado", "success");
      await recargarRangos();
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al agregar rango"), "error");
    } finally {
      setSaving(false);
    }
  };

  const guardarEdicion = async () => {
    if (!edicion) return;
    if (!edicion.fechaInicio || !edicion.fechaFin) {
      showToast("Indica ambas fechas", "error");
      return;
    }
    if (edicion.fechaInicio > edicion.fechaFin) {
      showToast("La fecha de inicio no puede ser mayor que la fecha de fin", "error");
      return;
    }
    setSaving(true);
    try {
      await RangosFechasAlimentacionService.update(edicion.id, {
        fechaInicio: edicion.fechaInicio,
        fechaFin: edicion.fechaFin,
      });
      setEdicion(null);
      showToast("Rango actualizado", "success");
      await recargarRangos();
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error al actualizar"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIhss = async () => {
    const piso = parseNum(pisoIhss);
    const ded = parseNum(deduccionIhssFija);
    if (!Number.isFinite(piso) || piso <= 0) {
      showToast("Piso IHSS inválido", "error");
      return;
    }
    if (!Number.isFinite(ded) || ded < 0) {
      showToast("Deducción fija IHSS inválida", "error");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        GlobalConfigService.upsert({
          key: "PISO_IHSS",
          value: String(piso),
          description: "Piso IHSS (base para RAP/cálculos relacionados)",
        }),
        GlobalConfigService.upsert({
          key: "DEDUCCION_IHSS_FIJA",
          value: String(ded),
          description: "Deducción fija IHSS",
        }),
      ]);
      setLoadedKeys((prev) => ({
        ...prev,
        pisoIhss: true,
        deduccionIhssFija: true,
      }));
      showToast("Parámetros IHSS guardados", "success");
    } catch (e: unknown) {
      showToast(mensajeErrorApi(e, "Error guardando parámetros"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRecargar = async () => {
    setReloading(true);
    try {
      await cargarIhss("refresh");
      if (tabActiva === "alimentacion") await recargarRangos();
    } finally {
      setReloading(false);
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
              onChange={(_, value: "alimentacion" | "ihss") =>
                setTabActiva(value)
              }
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab label="Alimentación" value="alimentacion" />
              <Tab label="IHSS" value="ihss" />
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
                          setMesAlim(1);
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

                  <Box
                    sx={{
                      minWidth: 200,
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: (t) => t.palette.action.hover,
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      Código de nómina
                    </Typography>
                    <Typography
                      component="p"
                      variant="body1"
                      sx={{ fontFamily: "ui-monospace, monospace", m: 0, mt: 0.5 }}
                    >
                      {codigoNomina}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                      Año, mes (4+2) y A o B (quincena). Solo lectura.
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="subtitle2" sx={{ pt: 1 }}>
                  Nuevo rango (este período)
                </Typography>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
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
                    disabled={
                      saving || listRangosLoading || rangos.length >= 1
                    }
                  >
                    Agregar rango
                  </Button>
                </Box>
                {rangos.length >= 1 && (
                  <Typography variant="caption" color="text.secondary">
                    Ya existe un rango para este código. No se pueden eliminar
                    registros; solo se puede editar el rango con la mayor fecha
                    de fin en todo el sistema.
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
                          <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                            <CircularProgress size={24} />
                          </TableCell>
                        </TableRow>
                      ) : rangos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                            No hay rangos para este código de nómina.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rangos.map((r) => {
                          const puedeEditar =
                            idPermiteEdicion != null &&
                            r.id === idPermiteEdicion;
                          return (
                            <TableRow key={r.id}>
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
                </TableContainer>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Configura los parámetros de IHSS usados en los cálculos de
                  nómina.
                  {!loadedKeys.pisoIhss || !loadedKeys.deduccionIhssFija
                    ? " (aún no existen, se crearán al guardar)"
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
                    label="Piso IHSS"
                    value={pisoIhss}
                    onChange={(e) => setPisoIhss(e.target.value)}
                    helperText="Ej: 11903.13"
                    sx={{ minWidth: 280, flex: "1 1 360px" }}
                  />

                  <TextField
                    label="Deducción fija IHSS"
                    value={deduccionIhssFija}
                    onChange={(e) => setDeduccionIhssFija(e.target.value)}
                    helperText="Ej: 595.16"
                    sx={{ minWidth: 280, flex: "1 1 360px" }}
                  />
                </Box>
              </Stack>
            )}

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {tabActiva === "ihss" && (
                <Button
                  variant="contained"
                  onClick={handleSaveIhss}
                  disabled={saving || reloading}
                  sx={{ minWidth: 120 }}
                  endIcon={
                    saving ? <CircularProgress size={16} color="inherit" /> : null
                  }
                >
                  Guardar
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() => void handleRecargar()}
                disabled={saving || reloading}
                sx={{ minWidth: 120 }}
                endIcon={
                  reloading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
              >
                Recargar
              </Button>
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
