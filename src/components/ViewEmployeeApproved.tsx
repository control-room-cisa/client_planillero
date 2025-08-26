import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  LinearProgress,
  Grow,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  TableContainer,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import type { PlanillaStatus } from "./rrhh/planillaConstants";
import type {
  ActividadData,
  RegistroDiarioData,
} from "../dtos/RegistrosDiariosDataDto";
import RegistroDiarioService from "../services/registroDiarioService";
import ymdInTZ from "../utils/timeZone";

interface Props {
  startDate: Date | null;
  endDate: Date | null;
  status: PlanillaStatus;
}

const ViewEmployeeApprovedReadOnly: React.FC<Props> = ({
  startDate,
  endDate,
  status,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // móvil: xs-sm

  const [registros, setRegistros] = useState<RegistroDiarioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchRegistros = useCallback(async () => {
    if (!startDate || !endDate) {
      setRegistros([]);
      return;
    }
    setLoading(true);
    try {
      const days: string[] = [];
      const cursor = new Date(startDate);
      const endLocal = new Date(endDate);
      cursor.setHours(0, 0, 0, 0);
      endLocal.setHours(0, 0, 0, 0);

      while (cursor.getTime() <= endLocal.getTime()) {
        const ymd = ymdInTZ(cursor);
        if (ymd) days.push(ymd);
        cursor.setDate(cursor.getDate() + 1);
      }

      const results = await Promise.all(
        days.map((fecha) => RegistroDiarioService.getByDate(fecha)) // empleado autenticado
      );

      const filtered = results
        .filter((r): r is RegistroDiarioData => r !== null)
        .filter((r) => {
          switch (status) {
            case "Pendiente":
              return r.aprobacionSupervisor == null;
            case "Aprobado":
              return r.aprobacionSupervisor === true;
            case "Rechazado":
              return r.aprobacionSupervisor === false;
            default:
              return true;
          }
        });

      setRegistros(filtered);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error al cargar registros",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  // Mostrar horas exactas del ISO en 24h, sin desfase de zona
  const formatTimeCorrectly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ p: 2, overflowX: "hidden" }}>
        <Typography marginLeft={4} variant="h5" color="primary" fontWeight="bold" gutterBottom>
          Mis registros diarios
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ height: 4, mb: 1.5 }}>
          {loading && (
            <LinearProgress
              sx={{ transition: "opacity 0.5s", opacity: loading ? 1 : 0 }}
            />
          )}
        </Box>

        <Stack spacing={2}>
          {registros.map((registro, idx) => {
            const normales =
              registro.actividades
                ?.filter((a) => !a.esExtra)
                .reduce((s, a) => s + (a.duracionHoras || 0), 0) ?? 0;
            const extras =
              registro.actividades
                ?.filter((a) => a.esExtra)
                .reduce((s, a) => s + (a.duracionHoras || 0), 0) ?? 0;
            const total = normales + extras;

            // Determinar si es turno nocturno (comparando en UTC)
            const entrada = new Date(registro.horaEntrada);
            const salida = new Date(registro.horaSalida);
            const entradaMin =
              entrada.getUTCHours() * 60 + entrada.getUTCMinutes();
            const salidaMin =
              salida.getUTCHours() * 60 + salida.getUTCMinutes();
            const esTurnoNocturno = entradaMin > salidaMin;

            return (
              <Grow key={registro.id!} in={!loading} timeout={300 + idx * 100}>
                <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                  {/* Encabezado del día */}
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ mb: 1, flexWrap: "wrap" }}
                  >
                    <Typography variant="subtitle1" sx={{ mr: 1 }}>
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
                  </Stack>

                  {/* Comentario del empleado (si hay) */}
                  {registro.comentarioEmpleado && (
                    <Typography
                      variant="body2"
                      color="black"
                      sx={{
                        mb: 2,
                        fontWeight: "bold",
                        wordBreak: "break-word",
                      }}
                    >
                      {registro.comentarioEmpleado}
                    </Typography>
                  )}

                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Actividades
                  </Typography>

                  {isMobile ? (
                    // ====== MÓVIL: Cards apiladas, TODO en columna ======
                    <Stack spacing={1}>
                      {registro.actividades
                        ?.slice()
                        .sort((a, b) => (a.esExtra === b.esExtra ? 0 : a.esExtra ? 1 : -1))
                        .map((act: ActividadData) => (
                          <Paper
                            key={act.id ?? `${act.jobId}-${act.descripcion}`}
                            variant="outlined"
                            sx={{ p: 1.5 }}
                          >
                            <Stack spacing={1} alignItems="flex-start">
                              {/* Descripción */}
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, wordBreak: "break-word" }}
                              >
                                {act.descripcion}
                              </Typography>

                              {/* Horas (en su propia línea) */}
                              <Chip
                                label={`${(act.duracionHoras || 0).toFixed(2)}h`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />

                              {/* Job y código (cada cosa en su línea si prefieres, aquí van juntos en texto) */}
                              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                                {(act.job?.codigo || "") + (act.job?.nombre ? ` • ${act.job?.nombre}` : "")}
                              </Typography>

                              {/* Tipo y clase en columna (uno debajo del otro) */}
                              <Stack direction="column" spacing={0.5} sx={{ width: "50%" }}>
                                <Chip
                                  label={act.esExtra ? "Extra" : "Normal"}
                                  size="small"
                                  color={act.esExtra ? "error" : "default"}
                                  variant={act.esExtra ? "filled" : "outlined"}
                                />
                                <Chip
                                  label={act.className || "Sin clase"}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                    </Stack>
                  ) : (
                    // ====== ESCRITORIO: Tabla clásica ======
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Descripción</TableCell>
                            <TableCell>Horas</TableCell>
                            <TableCell>Job</TableCell>
                            <TableCell>Código</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Clase</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {registro.actividades
                            ?.slice()
                            .sort((a, b) =>
                              a.esExtra === b.esExtra ? 0 : a.esExtra ? 1 : -1
                            )
                            .map((act: ActividadData) => (
                              <TableRow
                                key={act.id ?? `${act.jobId}-${act.descripcion}`}
                              >
                                <TableCell sx={{ maxWidth: 520, wordBreak: "break-word" }}>
                                  {act.descripcion}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${(act.duracionHoras || 0).toFixed(2)}h`}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>{act.job?.nombre}</TableCell>
                                <TableCell>{act.job?.codigo}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={act.esExtra ? "Extra" : "Normal"}
                                    size="small"
                                    color={act.esExtra ? "error" : "default"}
                                  />
                                </TableCell>
                                <TableCell>{act.className || "-"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Resumen de horas + Revisión del supervisor (alineados) */}
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Resumen de horas
                    </Typography>

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      sx={{ flexWrap: "wrap" }}
                    >
                      {/* Normales */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Normales:
                        </Typography>
                        <Chip
                          label={`${normales.toFixed(2)}h`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>

                      {/* Extras */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Extras:
                        </Typography>
                        <Chip
                          label={`${extras.toFixed(2)}h`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </Stack>

                      {/* Total */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Total:
                        </Typography>
                        <Chip
                          label={`${total.toFixed(2)}h`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>

                      {/* Empuja la revisión a la derecha en md+ */}
                      <Box
                        sx={{
                          flexGrow: 1,
                          display: { xs: "none", md: "block" },
                        }}
                      />

                      {/* Revisión del supervisor */}
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: { xs: 1, md: 0 } }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Revisión del supervisor:
                        </Typography>

                        {registro.aprobacionSupervisor === true && (
                          <Chip
                            label="Aprobado"
                            color="success"
                            variant="outlined"
                            size="small"
                          />
                        )}
                        {registro.aprobacionSupervisor === false && (
                          <Chip
                            label="Rechazado"
                            color="error"
                            variant="outlined"
                            size="small"
                          />
                        )}
                        {registro.aprobacionSupervisor === null && (
                          <Chip
                            label="Pendiente"
                            color="warning"
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Comentario del supervisor debajo (solo si existe) */}
                  {registro.comentarioSupervisor?.trim() && (
                    <Box sx={{ mt: -1, mb: 2 }}>
                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        <strong>Comentario:</strong>{" "}
                        {registro.comentarioSupervisor}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grow>
            );
          })}

          {!loading && registros.length === 0 && (
            <Typography>
              No hay registros para las fechas seleccionadas.
            </Typography>
          )}
        </Stack>

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
      </Box>
    </LocalizationProvider>
  );
};

export default ViewEmployeeApprovedReadOnly;
