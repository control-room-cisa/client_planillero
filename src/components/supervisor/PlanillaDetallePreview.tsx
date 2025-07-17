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
  Button,
  Chip,
  Stack,
  LinearProgress,
  Grow,
  Snackbar,
  Alert,
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
import type { Employee } from "../../types/auth";
import type { PlanillaStatus } from "./TimesheetReviewSupervisor";

interface Props {
  empleado: Employee;
  startDate: Date | null;
  endDate: Date | null;
  status: PlanillaStatus;
}

const PlanillaDetallePreviewSupervisor: React.FC<Props> = ({
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
      const current = new Date(startDate);
      while (current <= endDate) {
        days.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      const results = await Promise.all(
        days.map((fecha) => RegistroDiarioService.getByDate(fecha, empleado.id))
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
      const wait = Math.max(0, 1000 - elapsed);
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
      await RegistroDiarioService.aprobarSupervisor(id, true);
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
        RegistroDiarioService.aprobarSupervisor(
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

  // Función para formatear correctamente la hora
  const formatTimeCorrectly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC" // Usar UTC para evitar conversiones de zona horaria
    });
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
            const normales =
              registro.actividades
                ?.filter((a) => !a.esExtra)
                .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
            const extras =
              registro.actividades
                ?.filter((a) => a.esExtra)
                .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
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
                      {registro.fecha}
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
                      {registro.comentarioEmpleado}
                    </Typography>
                  )}

                  <Divider sx={{ mb: 2 }} />
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
                  <br></br>
                  {/* <Divider sx={{ my: 2 }} /> */}
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={disabled}
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

export default PlanillaDetallePreviewSupervisor;
