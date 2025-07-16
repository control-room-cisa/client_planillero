import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import RegistroDiarioService from "../services/registroDiarioService";
import type {
  RegistroDiarioData,
  ActividadData,
} from "../dtos/RegistrosDiariosDataDto";
import type { PlanillaStatus } from "./TimesheetReview";
import type { Employee } from "../types/auth";

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

  // Fetch registros when props change
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
        // Filter by status (Pendiente por defecto)
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
                return false;
            }
          });
        setRegistros(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistros();
  }, [startDate, endDate, empleado.id, status]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ p: 3 }}>
        {/* Nombre del empleado como título */}
        <Typography variant="h3" gutterBottom>
          {empleado.nombre} {empleado.apellido}
          {empleado.codigo ? ` (${empleado.codigo})` : ""}
        </Typography>

        {loading && <Typography>Cargando registros...</Typography>}
        {!loading && registros.length === 0 && (
          <Typography>
            No hay registros para las fechas seleccionadas.
          </Typography>
        )}

        {registros.map((registro) => {
          const horasNormales =
            registro.actividades
              ?.filter((a: ActividadData) => !a.esExtra)
              .reduce((sum, a) => sum + a.duracionHoras, 0) ?? 0;
          const horasExtras =
            registro.actividades
              ?.filter((a: ActividadData) => a.esExtra)
              .reduce((sum, a) => sum + a.duracionHoras, 0) ?? 0;

          return (
            <Paper key={registro.id} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              <Box sx={{ mb: 2, position: "relative" }}>
                <Stack direction="row" spacing={6} flexWrap="wrap">
                  <Typography variant="subtitle2">
                    Fecha: {registro.fecha}
                  </Typography>
                  {!registro.esDiaLibre && (
                    <>
                      <Typography variant="subtitle2">
                        Hora entrada:{" "}
                        {new Date(registro.horaEntrada).toLocaleTimeString(
                          "es-ES",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </Typography>
                      <Typography variant="subtitle2">
                        Hora salida:{" "}
                        {new Date(registro.horaSalida).toLocaleTimeString(
                          "es-ES",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </Typography>
                    </>
                  )}
                </Stack>
                {registro.esDiaLibre && (
                  <Chip
                    label="Día libre"
                    color="info"
                    sx={{ position: "absolute", top: 8, right: 16 }}
                  />
                )}
              </Box>

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
                    <TableCell>Código Job</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>ClassName</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registro.actividades?.map((act: ActividadData) => (
                    <TableRow key={act.id ?? act.jobId}>
                      <TableCell>{act.descripcion}</TableCell>
                      <TableCell>
                        <Chip label={`${act.duracionHoras}h`} size="small" />
                      </TableCell>
                      <TableCell>{act.job?.nombre}</TableCell>
                      <TableCell>{act.job?.codigo}</TableCell>
                      <TableCell>{act.esExtra ? "Extra" : "Normal"}</TableCell>
                      <TableCell>{act.className || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Typography variant="body2">
                  Horas normales: {horasNormales}h
                </Typography>
                <Typography variant="body2">
                  Horas extras: {horasExtras}h
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button variant="outlined" color="success">
                    Aprobar
                  </Button>
                  <Button variant="outlined" color="error">
                    Rechazar
                  </Button>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </LocalizationProvider>
  );
};

export default PlanillaDetallePreview;
