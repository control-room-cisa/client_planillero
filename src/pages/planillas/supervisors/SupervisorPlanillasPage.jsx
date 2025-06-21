import React, { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CommentIcon from "@mui/icons-material/Comment";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider/LocalizationProvider";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const SupervisorPlanillasView = () => {
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [rangoFechas, setRangoFechas] = useState({ inicio: null, fin: null });
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);

  // Lista simulada de empleados y planillas
  const empleados = [
    { id: 1, nombre: "Juan Perez" },
    { id: 2, nombre: "Maria Lopez" },
  ];

  const planillas = [
    {
      id: 101,
      fecha: "2025-06-10",
      nombreEmpleado: "Juan Perez",
      tareas: [
        { descripcion: "Tarea A", horas: 4 },
        { descripcion: "Tarea B", horas: 4 },
      ],
      turno: "dia",
      horasTotales: 8,
      estadoSupervisor: "pendiente",
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Gestión de Planillas
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              options={empleados}
              getOptionLabel={(option) => option.nombre}
              value={empleadoSeleccionado}
              onChange={(e, newValue) => setEmpleadoSeleccionado(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Buscar Empleado" fullWidth />
              )}
            />
          </Grid>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid item xs={6} md={3}>
            <DatePicker
              label="Desde"
              value={fechaDesde}
              onChange={(newValue) => setFechaDesde(newValue)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <DatePicker
              label="Hasta"
              value={fechaHasta}
              onChange={(newValue) => setFechaHasta(newValue)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          </LocalizationProvider>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Últimas Planillas
      </Typography>

      {planillas.map((planilla) => (
        <Accordion key={planilla.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box width="100%">
              <Typography variant="subtitle1">
                {planilla.nombreEmpleado} - {planilla.fecha} - Turno:{" "}
                {planilla.turno}
              </Typography>
              <Chip
                label={planilla.estadoSupervisor.toUpperCase()}
                color={
                  planilla.estadoSupervisor === "aprobado"
                    ? "success"
                    : planilla.estadoSupervisor === "rechazado"
                    ? "error"
                    : "warning"
                }
                sx={{ mt: 1 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {planilla.tareas.map((tarea, index) => (
              <Typography key={index}>
                • {tarea.descripcion} - {tarea.horas} hrs
              </Typography>
            ))}
            <Divider sx={{ my: 2 }} />
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
              >
                Aprobar
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<CloseIcon />}
              >
                Rechazar
              </Button>
              <TextField
                label="Comentario"
                fullWidth
                multiline
                rows={2}
                sx={{ flexGrow: 1 }}
                InputProps={{ startAdornment: <CommentIcon sx={{ mr: 1 }} /> }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default SupervisorPlanillasView;
