import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import RegistroDiarioService from "../services/registroDiarioService";
import type {
  RegistroDiarioData,
  ActividadData,
} from "../dtos/RegistrosDiariosDataDto";
import type { Employee } from "../types/auth";
import type { PlanillaStatus } from "./TimesheetReview";

interface Props {
  empleado: Employee;
  startDate: Date | null;
  endDate: Date | null;
  status: PlanillaStatus;
}

const PlanillaDetallePreview: React.FC<Props> = ({
  empleado,
  startDate,
  endDate,
  status,
}) => {
  const [registros, setRegistros] = useState<RegistroDiarioData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRegistros = async () => {
      if (!startDate || !endDate) {
        setRegistros([]);
        return;
      }
      setLoading(true);
      try {
        const days: string[] = [];
        let current = new Date(startDate);
        while (current <= endDate) {
          days.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 1);
        }
        const results = await Promise.all(
          days.map((fecha) =>
            RegistroDiarioService.getByDate(fecha, empleado.id)
          )
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
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistros();
  }, [startDate, endDate, empleado.id, status]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ p: 3 }}>
        {/* Header elegante */}
        <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
          {empleado.nombre} {empleado.apellido}
          {empleado.codigo && ` (${empleado.codigo})`}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Loading bar y placeholder */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Grow in={!loading} style={{ transformOrigin: "0 0 0" }} timeout={500}>
          <Box sx={{ opacity: loading ? 0 : 1, transition: "opacity 0.5s" }}>
            {registros.length === 0 && !loading ? (
              <Typography>
                No hay registros para las fechas seleccionadas.
              </Typography>
            ) : (
              registros.map((registro) => {
                const horasNormales =
                  registro.actividades
                    ?.filter((a) => !a.esExtra)
                    .reduce((sum, a) => sum + a.duracionHoras, 0) ?? 0;
                const horasExtras =
                  registro.actividades
                    ?.filter((a) => a.esExtra)
                    .reduce((sum, a) => sum + a.duracionHoras, 0) ?? 0;

                return (
                  <Paper
                    key={registro.id}
                    sx={{ p: 3, mb: 4, borderRadius: 2 }}
                  >
                    {/* Fecha y horas */}
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
                            Entrada:{" "}
                            {new Date(registro.horaEntrada).toLocaleTimeString(
                              "es-ES",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </Typography>
                          <Typography variant="body2">
                            Salida:{" "}
                            {new Date(registro.horaSalida).toLocaleTimeString(
                              "es-ES",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </Typography>
                        </>
                      ) : (
                        <Chip label="Día libre" color="info" />
                      )}
                    </Stack>

                    {/* Comentario empleado */}
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
                        {registro.actividades?.map((act: ActividadData) => (
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
                              {act.esExtra ? "Extra" : "Normal"}
                            </TableCell>
                            <TableCell>{act.className || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* <Divider sx={{ my: 2 }} /> */}
                    <br></br>
                    <Stack
                      direction="row"
                      spacing={4}
                      justifyContent="space-between"
                    >
                      <Typography variant="body2">
                        Normales: {horasNormales}h
                      </Typography>
                      <Typography variant="body2">
                        Extras: {horasExtras}h
                      </Typography>
                      <Box>
                        <Button
                          variant="outlined"
                          color="success"
                          sx={{ mr: 1 }}
                        >
                          Aprobar
                        </Button>
                        <Button variant="outlined" color="error">
                          Rechazar
                        </Button>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })
            )}
          </Box>
        </Grow>
      </Box>
    </LocalizationProvider>
  );
};

export default PlanillaDetallePreview;
