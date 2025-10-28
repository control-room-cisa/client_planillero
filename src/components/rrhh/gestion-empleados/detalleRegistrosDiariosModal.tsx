import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  Chip,
  Stack,
  LinearProgress,
  Grow,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  useMediaQuery,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import Swal from "sweetalert2";
import type { RegistroDiarioData } from "../../../dtos/RegistrosDiariosDataDto";
import RegistroDiarioService from "../../../services/registroDiarioService";

interface Props {
  open: boolean;
  onClose: () => void;
  empleadoId: number;
  fechaInicio: string;
  fechaFin: string;
}

const DetalleRegistrosDiariosModal: React.FC<Props> = ({
  open,
  onClose,
  empleadoId,
  fechaInicio,
  fechaFin,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [registros, setRegistros] = useState<RegistroDiarioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchRegistros = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      setRegistros([]);
      return;
    }
    setLoading(true);
    const start = Date.now();
    try {
      const days: string[] = [];
      const cursor = new Date(fechaInicio);
      const endLocal = new Date(fechaFin);

      cursor.setHours(0, 0, 0, 0);
      endLocal.setHours(0, 0, 0, 0);

      while (cursor.getTime() <= endLocal.getTime()) {
        const ymd = cursor.toISOString().split("T")[0];
        if (ymd) days.push(ymd);
        cursor.setDate(cursor.getDate() + 1);
      }

      const results = await Promise.all(
        days.map((fecha) => RegistroDiarioService.getByDate(fecha, empleadoId))
      );

      // Construir lista alineada a todas las fechas del período
      const registrosByFecha = new Map<string, RegistroDiarioData | null>();
      results.forEach((r, i) => {
        const key = days[i];
        registrosByFecha.set(key, r);
      });

      const aligned: RegistroDiarioData[] = days
        .map((fecha) => {
          const r = registrosByFecha.get(fecha);
          if (r) return r as RegistroDiarioData;
          // Placeholder sin información
          return {
            id: undefined as any,
            fecha,
            horaEntrada: "",
            horaSalida: "",
            jornada: "D",
            esDiaLibre: false,
            esHoraCorrida: false,
            comentarioEmpleado: "",
            actividades: [],
            aprobacionSupervisor: undefined,
            aprobacionRrhh: undefined,
          } as any as RegistroDiarioData;
        })
        .filter((r) => r.id); // Solo mostrar días con registro

      setRegistros(aligned);
    } catch (err) {
      console.error("Error fetching registros:", err);
      setSnackbar({
        open: true,
        message: "Error al cargar registros",
        severity: "error",
      });
    } finally {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 1000 - elapsed);
      setTimeout(() => setLoading(false), wait);
    }
  }, [fechaInicio, fechaFin, empleadoId]);

  useEffect(() => {
    if (open) {
      fetchRegistros();
    }
  }, [open, fetchRegistros]);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleRechazar = (id: number) => {
    Swal.fire({
      title: "Rechazar registro",
      input: "text",
      inputLabel: "Comentario",
      inputPlaceholder: "Ingrese motivo de rechazo",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) =>
        !value?.trim() ? "Comentario obligatorio" : null,
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        RegistroDiarioService.aprobarRrhh(
          id,
          false,
          undefined,
          result.value.trim()
        )
          .then(() => {
            setSnackbar({
              open: true,
              message: "Registro rechazado por RRHH",
              severity: "success",
            });
            fetchRegistros();
          })
          .catch((err) => {
            console.error("Reject error:", err);
            setSnackbar({
              open: true,
              message: "Error al rechazar",
              severity: "error",
            });
          });
      }
    });
  };

  const TZ = "America/Tegucigalpa";
  const parsePreserveLocal = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const d = new Date(dateString);
    // Si viene con sufijo Z (UTC), interpretamos sus componentes UTC como hora local
    if (typeof dateString === "string" && /Z$/i.test(dateString)) {
      return new Date(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds()
      );
    }
    return d;
  };
  const formatTimeCorrectly = (dateString: string) => {
    if (!dateString) return "-";
    const localDate = parsePreserveLocal(dateString);
    if (!localDate) return "-";
    return new Intl.DateTimeFormat("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }).format(localDate);
  };

  const formatDateInSpanish = (ymd: string) => {
    if (!ymd) return "Fecha no disponible";
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    const days = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName} ${day} de ${month} del ${year}`;
  };

  const calcularHorasNormales = (registro: RegistroDiarioData): number => {
    if (registro.esDiaLibre) return 0;
    const entrada = parsePreserveLocal(registro.horaEntrada);
    const salida = parsePreserveLocal(registro.horaSalida);
    if (!entrada || !salida) return 0;

    const entradaMin = entrada.getHours() * 60 + entrada.getMinutes();
    let salidaMin = salida.getHours() * 60 + salida.getMinutes();

    if (entradaMin === salidaMin) return 0;
    if (entradaMin > salidaMin) {
      salidaMin += 24 * 60;
    }

    const horasTrabajo = (salidaMin - entradaMin) / 60;
    const horaAlmuerzo = registro.esHoraCorrida ? 0 : 1;

    return Math.max(0, horasTrabajo - horaAlmuerzo);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Registros Diarios del Período</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2, md: 3 },
          pr: { xs: 1, md: 2 },
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          // asegurar que no haya bordes internos
          borderTop: "none",
          borderBottom: "none",
        }}
      >
        {loading && (
          <Box sx={{ position: "sticky", top: -24, zIndex: 1 }}>
            <LinearProgress />
          </Box>
        )}

        <Box
          sx={{ maxHeight: "70vh", overflowY: "auto", pr: { xs: 0.5, md: 1 } }}
        >
          <Stack spacing={2} sx={{ pt: 1.5, pb: 1.5 }}>
            {registros.map((registro, idx) => {
              const normales =
                registro.actividades
                  ?.filter((a) => !a.esExtra)
                  .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
              const extras =
                registro.actividades
                  ?.filter((a) => a.esExtra)
                  .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
              const total = normales + extras;

              const horasNormalesEsperadas = calcularHorasNormales(registro);
              const validacionHorasNormales =
                horasNormalesEsperadas === 0
                  ? normales === 0
                  : Math.abs(normales - horasNormalesEsperadas) < 0.1;

              const entradaHM = formatTimeCorrectly(registro.horaEntrada);
              const salidaHM = formatTimeCorrectly(registro.horaSalida);
              const [eh, em] = entradaHM.split(":").map(Number);
              const [sh, sm] = salidaHM.split(":").map(Number);
              const entradaMin = eh * 60 + em;
              const salidaMin = sh * 60 + sm;
              const esTurnoNocturno = salidaMin < entradaMin;

              // Ordenar actividades: extras antes de entrada, luego medio, luego extras después de salida. Dentro de cada grupo por hora de inicio asc.
              const toMinutes = (d?: string) => {
                if (!d) return Number.POSITIVE_INFINITY;
                const dt = parsePreserveLocal(d);
                if (!dt) return Number.POSITIVE_INFINITY;
                return dt.getHours() * 60 + dt.getMinutes();
              };
              const entradaMinLocal =
                (parsePreserveLocal(registro.horaEntrada)?.getHours() ?? 0) *
                  60 +
                (parsePreserveLocal(registro.horaEntrada)?.getMinutes() ?? 0);
              const salidaMinLocal =
                (parsePreserveLocal(registro.horaSalida)?.getHours() ?? 0) *
                  60 +
                (parsePreserveLocal(registro.horaSalida)?.getMinutes() ?? 0);
              const entradaLin = entradaMinLocal;
              const salidaLin =
                salidaMinLocal < entradaMinLocal
                  ? salidaMinLocal + 1440
                  : salidaMinLocal;
              const linearize = (min: number) =>
                esTurnoNocturno && min < entradaMinLocal ? min + 1440 : min;
              const activities = (registro.actividades ?? []).slice();
              const extraBefore: any[] = [];
              const middle: any[] = [];
              const extraAfter: any[] = [];
              for (const act of activities) {
                const startMin = toMinutes(act.horaInicio);
                const startLin = Number.isFinite(startMin)
                  ? linearize(startMin)
                  : Number.POSITIVE_INFINITY;
                const item = { act, startLin, startMin } as any;
                if (act.esExtra === true && startLin < entradaLin) {
                  extraBefore.push(item);
                } else if (act.esExtra === true && startLin >= salidaLin) {
                  extraAfter.push(item);
                } else {
                  middle.push(item);
                }
              }
              const cmpAsc = (a: any, b: any) =>
                (a.startMin ?? a.startLin) - (b.startMin ?? b.startLin);
              extraBefore.sort(cmpAsc);
              middle.sort(cmpAsc);
              extraAfter.sort(cmpAsc);

              // Insertar filas 'Libre'/'Almuerzo' entre actividades extra (antes y después del turno)
              const lunchStartMin = 12 * 60;
              const lunchEndMin = 13 * 60;
              const lunchLinStart = linearize(lunchStartMin);
              const lunchLinEnd = linearize(lunchEndMin);
              const addGaps = (items: any[]): any[] => {
                if (items.length === 0) return items;
                const withGaps: any[] = [];
                let prev = items[0];
                withGaps.push(prev);
                const toEndLin = (act: any): number => {
                  const endMin = toMinutes(act.horaFin);
                  const endLin = Number.isFinite(endMin)
                    ? linearize(endMin)
                    : prev.startLin;
                  return endLin;
                };
                let prevEnd = toEndLin(prev.act);
                for (let i = 1; i < items.length; i++) {
                  const curr = items[i];
                  const gapStart = prevEnd;
                  const gapEnd = curr.startLin;
                  if (gapEnd - gapStart > 1) {
                    const overlapsLunch =
                      Math.max(gapStart, lunchLinStart) <
                      Math.min(gapEnd, lunchLinEnd);
                    const label = overlapsLunch ? "Almuerzo" : "Libre";
                    const gapItem = {
                      act: {
                        id: `gap-${gapStart}-${gapEnd}-${registro.id}`,
                        descripcion: label,
                        duracionHoras:
                          Math.round(((gapEnd - gapStart) / 60) * 100) / 100,
                        _synthetic: label,
                        esExtra: true,
                      },
                      startLin: gapStart,
                    };
                    withGaps.push(gapItem);
                  }
                  withGaps.push(curr);
                  prev = curr;
                  prevEnd = toEndLin(curr.act);
                }
                return withGaps;
              };

              const extraBeforeWithGaps = addGaps(extraBefore);
              const extraAfterWithGaps = addGaps(extraAfter);

              const actividadesOrdenadas = [
                ...extraBeforeWithGaps,
                ...middle,
                ...extraAfterWithGaps,
              ].map((x) => x.act);

              return (
                <Grow
                  key={registro.id!}
                  in={!loading}
                  timeout={300 + idx * 100}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2, md: 3 },
                      borderRadius: 2,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "light"
                          ? theme.palette.grey[300]
                          : theme.palette.grey[700],
                      backgroundColor: (theme) =>
                        theme.palette.background.paper,
                    }}
                  >
                    {/* Encabezado del día */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={{ xs: 1, md: 4 }}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle1">
                        {registro.fecha
                          ? formatDateInSpanish(registro.fecha)
                          : "Fecha no disponible"}
                      </Typography>
                      {registro.esDiaLibre ? (
                        <Chip label="Día libre" color="info" size="small" />
                      ) : (
                        <>
                          <Typography variant="body2">
                            Entrada: {formatTimeCorrectly(registro.horaEntrada)}
                          </Typography>
                          <Typography variant="body2">
                            Salida: {formatTimeCorrectly(registro.horaSalida)}
                          </Typography>
                          {esTurnoNocturno && (
                            <Chip
                              label="Jornada Nocturna"
                              color="secondary"
                              size="small"
                            />
                          )}
                          {registro.esHoraCorrida && (
                            <Chip
                              label="Hora Corrida"
                              color="warning"
                              size="small"
                            />
                          )}
                        </>
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      {/* Indicadores de aprobación */}
                      {registro.aprobacionSupervisor === true && (
                        <Chip
                          label="Aprobado por supervisor"
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {registro.aprobacionSupervisor === false && (
                        <Chip
                          label="Rechazado por supervisor"
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {registro.aprobacionRrhh === true && (
                        <Chip
                          label="Procesado"
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {registro.aprobacionRrhh === false && (
                        <Chip
                          label="Rechazado RRHH"
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Stack>

                    {registro.comentarioEmpleado && (
                      <Typography
                        variant="body2"
                        color="black"
                        sx={{ mb: 2, fontWeight: "bold" }}
                      >
                        {registro.comentarioEmpleado}
                      </Typography>
                    )}

                    {/* Actividades */}
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Actividades
                    </Typography>

                    {registro.actividades && registro.actividades.length > 0 ? (
                      !isMobile ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Descripción</TableCell>
                                <TableCell>Horas</TableCell>
                                <TableCell>Horario</TableCell>
                                <TableCell>Job</TableCell>
                                <TableCell>Código</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Clase</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {actividadesOrdenadas.map((act: any) => {
                                const isSynthetic = Boolean(act?._synthetic);
                                const isSpecial = (
                                  act?.job?.codigo || ""
                                ).startsWith("E");
                                if (isSynthetic) {
                                  return (
                                    <TableRow key={act.id ?? act.jobId}>
                                      <TableCell colSpan={7} align="center">
                                        <Typography
                                          sx={{ color: "error.main" }}
                                        >
                                          {act.descripcion}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                                return (
                                  <TableRow key={act.id ?? act.jobId}>
                                    <TableCell>{act.descripcion}</TableCell>
                                    <TableCell>
                                      {Number.isFinite(
                                        Number(act.duracionHoras)
                                      ) ? (
                                        <Chip
                                          label={`${act.duracionHoras}h`}
                                          size="small"
                                        />
                                      ) : (
                                        <Chip
                                          label={`-`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {act.horaInicio && act.horaFin
                                        ? `${formatTimeCorrectly(
                                            act.horaInicio
                                          )} - ${formatTimeCorrectly(
                                            act.horaFin
                                          )}`
                                        : "-"}
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color={
                                          isSpecial ? "error.main" : undefined
                                        }
                                      >
                                        {act.job?.nombre ?? "-"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color={
                                          isSpecial ? "error.main" : undefined
                                        }
                                      >
                                        {act.job?.codigo ?? "-"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={act.esExtra ? "Extra" : "Normal"}
                                        size="small"
                                        color={
                                          act.esExtra ? "error" : "default"
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {act.className || "-"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Stack spacing={1.5} sx={{ pt: 1, pb: 1 }}>
                          {actividadesOrdenadas.map((act: any) => {
                            const isSynthetic = Boolean(act?._synthetic);
                            const isSpecial = (
                              act?.job?.codigo || ""
                            ).startsWith("E");
                            return (
                              <Paper
                                key={act.id ?? act.jobId}
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  borderStyle: "solid",
                                  borderWidth: 1,
                                  borderColor: (theme) =>
                                    theme.palette.mode === "light"
                                      ? theme.palette.grey[300]
                                      : theme.palette.grey[700],
                                }}
                              >
                                <Stack spacing={1}>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Descripción
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600 }}
                                      color={
                                        isSynthetic &&
                                        act._synthetic === "Libre"
                                          ? "error.main"
                                          : undefined
                                      }
                                    >
                                      {act.descripcion}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Horario
                                    </Typography>
                                    <Typography variant="body2">
                                      {act.horaInicio && act.horaFin
                                        ? `${formatTimeCorrectly(
                                            act.horaInicio
                                          )} - ${formatTimeCorrectly(
                                            act.horaFin
                                          )}`
                                        : "-"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Horas
                                    </Typography>
                                    <Box>
                                      {Number.isFinite(
                                        Number(act.duracionHoras)
                                      ) ? (
                                        <Chip
                                          label={`${act.duracionHoras}h`}
                                          size="small"
                                        />
                                      ) : (
                                        <Chip
                                          label={`-`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Job
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color={
                                        isSpecial ? "error.main" : undefined
                                      }
                                    >
                                      {act.job?.nombre ?? "-"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Código
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color={
                                        isSpecial ? "error.main" : undefined
                                      }
                                    >
                                      {act.job?.codigo ?? "-"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Tipo
                                    </Typography>
                                    <Box>
                                      {isSynthetic ? (
                                        <Chip
                                          label={act._synthetic}
                                          size="small"
                                          color={
                                            act._synthetic === "Libre"
                                              ? "error"
                                              : "warning"
                                          }
                                          variant="outlined"
                                        />
                                      ) : (
                                        <Chip
                                          label={
                                            act.esExtra ? "Extra" : "Normal"
                                          }
                                          size="small"
                                          color={
                                            act.esExtra ? "error" : "default"
                                          }
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Clase
                                    </Typography>
                                    <Typography variant="body2">
                                      {isSynthetic ? "-" : act.className || "-"}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Stack>
                      )
                    ) : (
                      <Alert severity="info">
                        No hay actividades registradas para este día
                      </Alert>
                    )}

                    {/* Resumen de horas */}
                    {!registro.esDiaLibre && (
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Resumen de horas
                        </Typography>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                          alignItems={{ xs: "flex-start", md: "center" }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Normales:
                            </Typography>
                            <Chip
                              label={`${normales}h`}
                              size="small"
                              variant="outlined"
                              color={
                                validacionHorasNormales ? "default" : "error"
                              }
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              {`(esperadas: ${horasNormalesEsperadas.toFixed(
                                2
                              )} h)`}
                            </Typography>
                          </Stack>

                          {extras > 0 && (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Extras:
                              </Typography>
                              <Chip
                                label={`${extras}h`}
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            </Stack>
                          )}

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Total:
                            </Typography>
                            <Chip
                              label={`${total}h`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Stack>
                        </Stack>
                      </Box>
                    )}

                    {/* Botón Rechazar */}
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRechazar(registro.id!)}
                        disabled={registro.aprobacionRrhh === false}
                      >
                        Rechazar Registro
                      </Button>
                    </Box>
                  </Paper>
                </Grow>
              );
            })}

            {!loading && registros.length === 0 && (
              <Alert severity="warning">
                No hay registros para las fechas seleccionadas.
              </Alert>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default DetalleRegistrosDiariosModal;
