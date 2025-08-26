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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import Swal from "sweetalert2";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import RegistroDiarioService from "../../services/registroDiarioService";
import type {
  RegistroDiarioData,
  ActividadData,
} from "../../dtos/RegistrosDiariosDataDto";
import type { Empleado } from "../../services/empleadoService";
import type { PlanillaStatus } from "./planillaConstants";
import ymdInTZ from "../../utils/timeZone";

interface Props {
  empleado: Empleado;
  startDate: Date | null;
  endDate: Date | null;
  status: PlanillaStatus;
}

const PlanillaDetallePreviewRrhh: React.FC<Props> = ({
  empleado,
  startDate,
  endDate,
  status,
}) => {
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
    const start = Date.now();
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
        days.map((fecha) => RegistroDiarioService.getByDate(fecha, empleado.id))
      );

      const filtered = results
        .filter((r): r is RegistroDiarioData => r !== null)
        // RRHH solo ve lo que ya aprobó Supervisor
        .filter((r) => r.aprobacionSupervisor === true)
        .filter((r) => {
          switch (status) {
            case "Pendiente":
              return r.aprobacionRrhh == null;
            case "Aprobado":
              return r.aprobacionRrhh === true;
            case "Rechazado":
              return r.aprobacionRrhh === false;
          }
        });

      setRegistros(filtered);
    } catch (err) {
      console.error("Error fetching registros:", err);
      setSnackbar({
        open: true,
        message: "Error al cargar registros",
        severity: "error",
      });
    } finally {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 800 - elapsed);
      setTimeout(() => setLoading(false), wait);
    }
  }, [startDate, endDate, empleado.id, status]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleAprobar = async (id: number) => {
    try {
      await RegistroDiarioService.aprobarRrhh(id, true);
      setSnackbar({
        open: true,
        message: "Registro aprobado",
        severity: "success",
      });
      fetchRegistros();
    } catch (err) {
      console.error("Approve error:", err);
      setSnackbar({
        open: true,
        message: "Error al aprobar",
        severity: "error",
      });
    }
  };

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
              message: "Registro rechazado",
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

  // Resumen de horas normal/extra/total
  const calcularResumenHoras = (actividades?: ActividadData[]) => {
    if (!actividades || actividades.length === 0) {
      return { normales: 0, extras: 0, total: 0 };
    }

    const normales = actividades
      .filter((a) => !a.esExtra)
      .reduce((sum, act) => sum + act.duracionHoras, 0);

    const extras = actividades
      .filter((a) => a.esExtra)
      .reduce((sum, act) => sum + act.duracionHoras, 0);

    return { normales, extras, total: normales + extras };
  };

  // Hora exacta del ISO → UTC (no aplica TZ del navegador)
  const formatTimeCorrectly = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  };

  // Mostrar 'registro.fecha' sin desfase
  const formatDateInSpanish = (ymd: string) => {
    if (!ymd) return "Fecha no disponible";
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d); // local date, sin conversión
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
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]
      } del ${date.getFullYear()}`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
          {empleado.nombre} {empleado.apellido}
          {empleado.codigo ? ` (${empleado.codigo})` : ""}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ height: 4, mb: 2 }}>
          {loading && (
            <LinearProgress
              sx={{ transition: "opacity 0.5s", opacity: loading ? 1 : 0 }}
            />
          )}
        </Box>

        <Stack spacing={2}>
          {registros.map((registro, idx) => {
            const horasResumen = calcularResumenHoras(registro.actividades);
            const disabled = registro.aprobacionRrhh === true;

            return (
              <Grow key={registro.id!} in={!loading} timeout={300 + idx * 100}>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Stack
                    direction="row"
                    spacing={4}
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle1">
                      {registro.fecha
                        ? formatDateInSpanish(registro.fecha)
                        : "Fecha no disponible"}
                    </Typography>
                    {!registro.esDiaLibre ? (
                      <>
                        <Typography variant="body2">
                          Entrada: {formatTimeCorrectly(registro.horaEntrada)}
                        </Typography>
                        <Typography variant="body2">
                          Salida: {formatTimeCorrectly(registro.horaSalida)}
                        </Typography>
                      </>
                    ) : (
                      <Chip label="Día libre" color="info" />
                    )}
                  </Stack>

                  {registro.comentarioEmpleado && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      <strong>Comentario del empleado:</strong>{" "}
                      {registro.comentarioEmpleado}
                    </Typography>
                  )}

                  <Divider sx={{ mb: 2 }} />

                  {/* Tabla de actividades */}
                  <Typography variant="subtitle2" gutterBottom>
                    Actividades
                  </Typography>
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
                          <TableRow key={act.id ?? act.jobId}>
                            <TableCell>{act.descripcion}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${act.duracionHoras}h`}
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

                  {/* Resumen de horas */}
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Resumen de horas
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Normales:
                      </Typography>
                      <Chip
                        label={`${horasResumen.normales}h`}
                        size="small"
                        variant="outlined"
                      />

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 2 }}
                      >
                        Extras:
                      </Typography>
                      <Chip
                        label={`${horasResumen.extras}h`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 2 }}
                      >
                        Total:
                      </Typography>
                      <Chip
                        label={`${horasResumen.total}h`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  </Box>

                  {/* Estado de aprobación del supervisor */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Revisión del supervisor
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip
                        label="Aprobado"
                        color="success"
                        variant="outlined"
                      />

                      {registro.comentarioSupervisor && (
                        <Typography variant="body2">
                          <strong>Comentario:</strong>{" "}
                          {registro.comentarioSupervisor}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Botones de acción */}
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleRechazar(registro.id!)}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      disabled={disabled}
                      onClick={() => handleAprobar(registro.id!)}
                    >
                      Aprobar
                    </Button>
                  </Stack>
                </Paper>
              </Grow>
            );
          })}

          {!loading && registros.length === 0 && (
            <Typography>
              No hay registros aprobados por el supervisor para las fechas seleccionadas.
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

export default PlanillaDetallePreviewRrhh;
