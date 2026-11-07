import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import type { PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import {
  SolicitudPermisoService,
  solicitudErrorMessage,
  type Paginated,
  type SolicitudDia,
  type SolicitudPermiso,
  type TipoSolicitudPermiso,
} from "../../services/solicitudPermisoService";
import RegistroDiarioService, {
  type TiempoCompensatorioData,
} from "../../services/registroDiarioService";
import TiempoCompensatorioAcumulado from "../common/TiempoCompensatorioAcumulado";
import {
  EstadoAprobacion,
  TIPO_LABEL,
  formatFecha,
  formatFechaHora,
  nombreEmpleado,
} from "./solicitudesUi";

export type SolicitudModalIntent = "create" | "edit" | "view";
export type SolicitudModalMode = "empleado" | "supervisor" | "rrhh";

type Props = {
  open: boolean;
  mode: SolicitudModalMode;
  intent: SolicitudModalIntent;
  solicitudId: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type DiaCalendarioProps = PickersDayProps & {
  fechasTomadas?: ReadonlySet<string>;
};

function DiaCalendario({
  fechasTomadas,
  day,
  sx,
  ...other
}: DiaCalendarioProps) {
  const fecha = format(day, "yyyy-MM-dd");
  const tomada = fechasTomadas?.has(fecha) ?? false;

  return (
    <PickersDay
      {...other}
      day={day}
      selected={tomada}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        tomada && {
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:hover, &:focus": { bgcolor: "primary.dark" },
        },
      ]}
    />
  );
}

type DiaFormulario = {
  fecha: string;
  diaCompleto: boolean;
  comentarioHorario: string;
};

const emptyForm = () => ({
  tipo: "VACACIONES" as TipoSolicitudPermiso,
  comentario: "",
  dias: [] as DiaFormulario[],
});

function readers(mode: SolicitudModalMode) {
  if (mode === "supervisor") {
    return {
      get: SolicitudPermisoService.getSupervision,
      dias: SolicitudPermisoService.listDiasSupervision,
    };
  }
  if (mode === "rrhh") {
    return {
      get: SolicitudPermisoService.getRrhh,
      dias: SolicitudPermisoService.listDiasRrhh,
    };
  }
  return {
    get: SolicitudPermisoService.getMia,
    dias: SolicitudPermisoService.listDiasMias,
  };
}

function formatHoras(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(2);
}

export default function SolicitudPermisoModal({
  open,
  mode,
  intent,
  solicitudId,
  onClose,
  onSaved,
}: Props) {
  const [solicitud, setSolicitud] = useState<SolicitudPermiso | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [diasPage, setDiasPage] = useState(1);
  const [dias, setDias] = useState<Paginated<SolicitudDia> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState("");
  const [pidiendoRechazo, setPidiendoRechazo] = useState(false);
  const [saldos, setSaldos] = useState<TiempoCompensatorioData | null>(null);
  const [saldosError, setSaldosError] = useState<string | null>(null);
  const [detalleSaldos, setDetalleSaldos] = useState(false);
  const [paso, setPaso] = useState<1 | 2>(1);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const editing = intent === "create" || intent === "edit";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRechazo("");
    setPidiendoRechazo(false);
    setDiasPage(1);
    setPaso(1);
    if (intent === "create") {
      setSolicitud(null);
      setForm(emptyForm());
      setDias(null);
    }
  }, [open, intent, solicitudId]);

  useEffect(() => {
    if (!open || intent === "create" || !solicitudId) return;
    let cancelled = false;
    setLoading(true);
    readers(mode)
      .get(solicitudId)
      .then(async (detail) => {
        if (cancelled) return;
        setSolicitud(detail);
        if (intent === "edit") {
          const todos = await readers(mode).dias(solicitudId, 1, 60);
          if (cancelled) return;
          setForm({
            tipo: detail.tipo,
            comentario: detail.comentario ?? "",
            dias: todos.items.map((dia) => ({
              fecha: dia.fecha,
              diaCompleto: !dia.comentarioHorario?.trim(),
              comentarioHorario: dia.comentarioHorario ?? "",
            })),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(solicitudErrorMessage(err, "No se pudo abrir la solicitud"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, intent, solicitudId, mode]);

  useEffect(() => {
    if (!open || editing || !solicitudId) return;
    let cancelled = false;
    readers(mode)
      .dias(solicitudId, diasPage, 10)
      .then((data) => {
        if (!cancelled) setDias(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(solicitudErrorMessage(err, "No se pudieron cargar los días"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, editing, solicitudId, mode, diasPage]);

  useEffect(() => {
    if (!open || mode === "empleado" || !solicitud) return;
    let cancelled = false;
    setSaldos(null);
    setSaldosError(null);
    RegistroDiarioService.getTiempoCompensatorio(solicitud.empleado.id, {
      seccion: "vacaciones",
      page: 1,
      limit: 10,
    })
      .then((data) => {
        if (!cancelled) setSaldos(data);
      })
      .catch(() => {
        if (!cancelled) setSaldosError("No se pudieron cargar los saldos");
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, solicitud]);

  const elegirDia = (day: Date | null) => {
    if (!day) return;
    const fecha = format(day, "yyyy-MM-dd");
    if (form.dias.some((dia) => dia.fecha === fecha)) {
      setError(null);
      setForm((current) => ({
        ...current,
        dias: current.dias.filter((dia) => dia.fecha !== fecha),
      }));
      return;
    }
    if (form.dias.length >= 60) {
      setError("Máximo 60 días por solicitud");
      return;
    }
    setError(null);
    setForm((current) => ({
      ...current,
      dias: [...current.dias, { fecha, diaCompleto: true, comentarioHorario: "" }].sort(
        (a, b) => a.fecha.localeCompare(b.fecha)
      ),
    }));
  };

  const cambiarDia = (fecha: string, patch: Partial<DiaFormulario>) => {
    setForm((current) => ({
      ...current,
      dias: current.dias.map((dia) =>
        dia.fecha === fecha ? { ...dia, ...patch } : dia
      ),
    }));
  };

  const fechasTomadas = new Set(form.dias.map((dia) => dia.fecha));
  const diasParciales = form.dias.filter((dia) => !dia.diaCompleto);

  const continuar = () => {
    if (form.dias.length === 0) {
      setError("Agrega al menos un día");
      return;
    }
    setError(null);
    setPaso(2);
  };

  const guardar = async () => {
    if (form.dias.length === 0) {
      setError("Agrega al menos un día");
      return;
    }
    if (form.dias.some((dia) => !dia.diaCompleto && !dia.comentarioHorario.trim())) {
      setError("Indique el horario de los días que no son completos");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      tipo: form.tipo,
      comentario: form.comentario.trim() || null,
      dias: form.dias.map((dia) => ({
        fecha: dia.fecha,
        comentarioHorario: dia.diaCompleto ? null : dia.comentarioHorario.trim(),
      })),
    };
    try {
      if (intent === "create") {
        await SolicitudPermisoService.create(body);
        onSaved("Solicitud creada");
      } else if (solicitudId) {
        await SolicitudPermisoService.update(solicitudId, body);
        onSaved("Solicitud actualizada");
      }
      onClose();
    } catch (err) {
      setError(solicitudErrorMessage(err, "No se pudo guardar la solicitud"));
    } finally {
      setSaving(false);
    }
  };

  const decidir = async (aprobado: boolean) => {
    if (!solicitudId) return;
    if (!aprobado && !rechazo.trim()) {
      setError("El comentario es obligatorio al rechazar");
      setPidiendoRechazo(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const comentario = aprobado ? null : rechazo.trim();
      if (mode === "supervisor") {
        await SolicitudPermisoService.decidirSupervision(
          solicitudId,
          aprobado,
          comentario
        );
      } else {
        await SolicitudPermisoService.decidirRrhh(
          solicitudId,
          aprobado,
          comentario
        );
      }
      onSaved(aprobado ? "Solicitud aprobada" : "Solicitud rechazada");
      onClose();
    } catch (err) {
      setError(solicitudErrorMessage(err, "No se pudo registrar la decisión"));
    } finally {
      setSaving(false);
    }
  };

  const puedeDecidir =
    solicitud != null &&
    ((mode === "supervisor" && solicitud.aprobacionSupervisor === null) ||
      (mode === "rrhh" &&
        solicitud.aprobacionSupervisor === true &&
        solicitud.aprobacionRrhh === null));

  const titulo =
    intent === "create"
      ? "Nueva solicitud"
      : intent === "edit"
        ? "Editar solicitud"
        : "Solicitud";

  return (
    <>
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        fullScreen={isMobile}
        maxWidth={editing ? "sm" : "md"}
        fullWidth
        scroll="paper"
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "flex-start", gap: 1, pr: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
            {titulo}
            {editing && (
              <Typography variant="body2" color="text.secondary" component="div">
                {paso === 1 ? "Seleccione los días" : "Comentarios"}
              </Typography>
            )}
          </Box>
          <IconButton
            aria-label="Cerrar"
            onClick={onClose}
            disabled={saving}
            edge="end"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loading && <Typography>Cargando…</Typography>}

          {editing && paso === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl>
                <RadioGroup
                  row
                  value={form.tipo}
                  sx={{ flexWrap: "wrap" }}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tipo: event.target.value as TipoSolicitudPermiso,
                    }))
                  }
                >
                  <FormControlLabel
                    value="VACACIONES"
                    control={<Radio />}
                    label="Vacaciones"
                  />
                  <FormControlLabel
                    value="PERMISO"
                    control={<Radio />}
                    label="Permiso"
                  />
                </RadioGroup>
              </FormControl>
              {form.tipo === "VACACIONES" && (
                <Alert severity="warning">
                  En vacaciones solo se puede solicitar medio día o día completo.
                </Alert>
              )}
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DateCalendar
                  value={null}
                  onChange={elegirDia}
                  slots={{ day: DiaCalendario }}
                  slotProps={{
                    day: { fechasTomadas } as unknown as DiaCalendarioProps,
                  }}
                  sx={{ width: "100%", maxWidth: 360, mx: "auto" }}
                />
                <Typography variant="caption" color="text.secondary">
                  Cada clic agrega un día. Otro clic en un día marcado lo quita.
                </Typography>
              </LocalizationProvider>
              {form.dias.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Aún no hay días.
                </Typography>
              )}
              {form.dias.map((dia) => (
                <Box
                  key={dia.fecha}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                    py: 0.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ flex: "1 1 120px", minWidth: 0 }}>
                    {formatFecha(dia.fecha)}
                  </Typography>
                  <FormControlLabel
                    sx={{ mr: 0 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={dia.diaCompleto}
                        onChange={(event) =>
                          cambiarDia(dia.fecha, {
                            diaCompleto: event.target.checked,
                            comentarioHorario: event.target.checked
                              ? ""
                              : dia.comentarioHorario,
                          })
                        }
                      />
                    }
                    label="Día completo"
                  />
                  <IconButton
                    size="small"
                    aria-label="Quitar día"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        dias: current.dias.filter((item) => item.fecha !== dia.fecha),
                      }))
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {editing && paso === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {diasParciales.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {form.tipo === "VACACIONES"
                    ? "En vacaciones solo se puede solicitar medio día o día completo."
                    : "Describa el horario del permiso."}
                </Typography>
              )}
              {diasParciales.map((dia) => (
                <TextField
                  key={dia.fecha}
                  fullWidth
                  label={formatFecha(dia.fecha)}
                  placeholder={
                    form.tipo === "VACACIONES"
                      ? "Mañana o tarde"
                      : "Describa el horario del permiso"
                  }
                  value={dia.comentarioHorario}
                  onChange={(event) =>
                    cambiarDia(dia.fecha, { comentarioHorario: event.target.value })
                  }
                  inputProps={{ maxLength: 200 }}
                />
              ))}
              <TextField
                label="Comentario"
                value={form.comentario}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    comentario: event.target.value,
                  }))
                }
                multiline
                minRows={2}
                fullWidth
                inputProps={{ maxLength: 500 }}
              />
            </Box>
          )}

          {!editing && solicitud && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {mode !== "empleado" && (
                <Typography variant="subtitle1">
                  {nombreEmpleado(solicitud.empleado)}
                </Typography>
              )}
              <Typography>
                {TIPO_LABEL[solicitud.tipo]}
                {solicitud.comentario ? ` — ${solicitud.comentario}` : ""}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="body2">Supervisor</Typography>
                <EstadoAprobacion value={solicitud.aprobacionSupervisor} />
                <Typography variant="body2" color="text.secondary">
                  {formatFechaHora(solicitud.fechaAprobacionSupervisor)}
                </Typography>
              </Box>
              {solicitud.comentarioSupervisor && (
                <Typography variant="body2">
                  Comentario de supervisor: {solicitud.comentarioSupervisor}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="body2">RRHH</Typography>
                <EstadoAprobacion value={solicitud.aprobacionRrhh} />
                <Typography variant="body2" color="text.secondary">
                  {formatFechaHora(solicitud.fechaAprobacionRrhh)}
                </Typography>
              </Box>
              {solicitud.comentarioRrhh && (
                <Typography variant="body2">
                  Comentario de RRHH: {solicitud.comentarioRrhh}
                </Typography>
              )}

              {mode !== "empleado" && (
                <Box sx={{ mt: 1 }}>
                  {saldosError && <Alert severity="warning">{saldosError}</Alert>}
                  {saldos && (
                    <Typography variant="body2">
                      Vacaciones acumuladas: {formatHoras(saldos.tiempoVacacionesHoras)} h
                      {" · "}
                      Horas compensatorias:{" "}
                      {formatHoras(saldos.totales.horasAcumuladasPorJob)} h
                    </Typography>
                  )}
                  <Button size="small" onClick={() => setDetalleSaldos(true)} sx={{ mt: 0.5 }}>
                    Ver detalle de saldos
                  </Button>
                </Box>
              )}

              <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Horario</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dias?.items.map((dia) => (
                    <TableRow key={dia.id}>
                      <TableCell>{formatFecha(dia.fecha)}</TableCell>
                      <TableCell>
                        {dia.comentarioHorario?.trim()
                          ? dia.comentarioHorario
                          : "Día completo"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
              {dias && (
                <TablePagination
                  component="div"
                  count={dias.pagination.total}
                  page={diasPage - 1}
                  onPageChange={(_, next) => setDiasPage(next + 1)}
                  rowsPerPage={10}
                  rowsPerPageOptions={[10]}
                  onRowsPerPageChange={() => undefined}
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} de ${count}`
                  }
                  sx={{
                    ".MuiTablePagination-toolbar": {
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                      px: 0,
                    },
                  }}
                />
              )}

              {puedeDecidir && pidiendoRechazo && (
                <TextField
                  label="Comentario de rechazo"
                  value={rechazo}
                  onChange={(event) => setRechazo(event.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                  required
                  inputProps={{ maxLength: 500 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        {(editing || puedeDecidir) && (
        <DialogActions
          sx={{
            flexWrap: "wrap",
            gap: 1,
            px: 2,
            py: 1.5,
            ...(isMobile && {
              flexDirection: "column-reverse",
              alignItems: "stretch",
              "& .MuiButton-root": { m: 0 },
            }),
          }}
        >
          {editing && paso === 2 && (
            <Button
              onClick={() => {
                setError(null);
                setPaso(1);
              }}
              disabled={saving}
            >
              Atrás
            </Button>
          )}
          {editing && paso === 1 && (
            <Button variant="contained" onClick={continuar} disabled={saving || loading}>
              Siguiente
            </Button>
          )}
          {editing && paso === 2 && (
            <Button variant="contained" onClick={guardar} disabled={saving}>
              Guardar
            </Button>
          )}
          {puedeDecidir && !pidiendoRechazo && (
            <>
              <Button
                color="error"
                onClick={() => setPidiendoRechazo(true)}
                disabled={saving}
              >
                Rechazar
              </Button>
              <Button
                variant="contained"
                onClick={() => decidir(true)}
                disabled={saving}
              >
                Aprobar
              </Button>
            </>
          )}
          {puedeDecidir && pidiendoRechazo && (
            <Button
              color="error"
              variant="contained"
              onClick={() => decidir(false)}
              disabled={saving}
            >
              Confirmar rechazo
            </Button>
          )}
        </DialogActions>
        )}
      </Dialog>
      {solicitud && mode !== "empleado" && (
        <TiempoCompensatorioAcumulado
          open={detalleSaldos}
          onClose={() => setDetalleSaldos(false)}
          empleadoId={solicitud.empleado.id}
          nombreEmpleado={nombreEmpleado(solicitud.empleado)}
        />
      )}
    </>
  );
}
