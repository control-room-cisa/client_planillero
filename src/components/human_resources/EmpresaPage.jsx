// src/pages/EmpresaPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Chip,
  Divider,
} from "@mui/material";

import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DoneIcon from "@mui/icons-material/Done";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const EmpresaPage = () => {

  const { empresa } = useParams();
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(empresa || "");
  const [data, setData] = useState([]);

  const [selectedUsuario, setSelectedUsuario] = useState("");
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    customers();
  }, []);

  const customers = async () => {
    try {
      const result = await axios.get(`${API}/customers`);
      setEmpresas(result.data);
    } catch (error) {
      console.error("Error al obtener las empresas:", error);
    }
  };

  useEffect(() => {
    if (!empresaSeleccionada) return;
    const fetchEmpleados = async () => {
      try {
        const res = await fetch(`${API}/empleados/${empresaSeleccionada}`);
        const result = await res.json();
        setData(result);
        setSelectedUsuario("");
        setFechaInicio(null);
        setFechaFin(null);
      } catch (error) {
        console.error("Error al obtener empleados:", error);
      }
    };
    fetchEmpleados();
  }, [empresaSeleccionada]);

  const usuarios = {};
  data.forEach((row) => {
    const usuarioId = row.usuario_id;
    if (!usuarios[usuarioId]) {
      usuarios[usuarioId] = {
        usuario_id: usuarioId,
        nombre_completo: `${row.usuario_nombre} ${row.usuario_apellido}`,
        registros: [],
      };
    }
    usuarios[usuarioId].registros.push({
      registro_id: row.registro_id,
      fecha: row.fecha,
      turno: row.turno,
      hora_entrada: row.hora_entrada,
      hora_salida: row.hora_salida,
      horas_normales: row.horas_normales,
      tarea_extra: row.tarea_extra_id
        ? {
            descripcion: row.tarea_extra_descripcion,
            horas: row.tarea_extra_horas,
            job_number: row.tarea_extra_job_number,
            job_description: row.tarea_extra_job_description,
            class_number: row.tarea_extra_class,
          }
        : null,
      tareas_registradas: row.tareas_registradas_json?.tareas || [],
    });
  });

  const usuariosList = Object.values(usuarios);
  const usuarioSeleccionado = usuarios[selectedUsuario];

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const limpiarFiltros = () => {
    setFechaInicio(null);
    setFechaFin(null);
    setSelectedUsuario("");
  };

  return (
    <Box sx={{ padding: { xs: 1, sm: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ display: "flex", justifyContent:"center"}}>
        Reporte Hojas de Tiempo
      </Typography>
      <>
        {/* Filtros */}
        <Paper
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 5,
            mt: 2,
            paddingX: 2,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* SELECTOR DE USUARIO */}
              <FormControl sx={{ minWidth: 240, flex: 1 }}>
                <InputLabel>Selecciona una empresa</InputLabel>
                <Select
                  value={empresaSeleccionada}
                  label="Selecciona una empresa"
                  onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#1e749c",
                    },
                  }}
                >
                  <MenuItem value="">-- Seleccionar --</MenuItem>
                  {empresas.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                sx={{ minWidth: 240, flex: 1 }}
                disabled={!empresaSeleccionada}
              >
                <InputLabel>Selecciona un empleado</InputLabel>
                <Select
                  value={selectedUsuario}
                  label="Selecciona un empleado"
                  onChange={(e) => setSelectedUsuario(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#1e749c",
                    },
                  }}
                >
                  <MenuItem value="">-- Seleccionar --</MenuItem>
                  {usuariosList.map((u) => (
                    <MenuItem key={u.usuario_id} value={u.usuario_id}>
                      {u.nombre_completo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DatePicker
                label="Fecha inicio"
                format="DD/MM/YYYY"
                value={fechaInicio}
                onChange={setFechaInicio}
                disabled={!selectedUsuario}
                sx={{ minWidth: 170, flex: 1 }}
                slotProps={{
                  textField: {
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#1976d2",
                      },
                    },
                  },
                }}
              />
              <DatePicker
                label="Fecha fin"
                format="DD/MM/YYYY"
                value={fechaFin}
                minDate={fechaInicio}
                onChange={setFechaFin}
                disabled={!selectedUsuario}
                sx={{ minWidth: 170, flex: 1 }}
                slotProps={{
                  textField: {
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#1976d2",
                      },
                    },
                  },
                }}
              />

              {/* BOTÓN LIMPIAR */}
              <Button
                sx={{
                  height: 55,
                  backgroundColor: "#eefafd",
                  color: "black",
                  "&:hover": { backgroundColor: "#d5f1f8", color: "black" },
                  minWidth: 180,
                  flex: 1,
                  fontSize: { xs: 15, sm: 15, md: 15, lg: 13, xl: 15 },
                }}
                variant="outlined"
                onClick={limpiarFiltros}
              >
                Limpiar filtros
              </Button>
            </Box>
          </LocalizationProvider>
        </Paper>

        {/* MENSAJES Y TABLAS */}
        {selectedUsuario === "" ? (
          <Typography
            sx={{ display: "flex", justifyContent: "center", fontSize: 30 }}
          >
            Por favor selecciona una empresa y empleados para ver sus hojas de tiempo .
          </Typography>
        ) : usuarioSeleccionado.registros.length === 0 ? (
          <Typography>No hay registros para este usuario.</Typography>
        ) : (
          usuarioSeleccionado.registros
            .filter((r) => {
              const fechaRegistro = dayjs(r.fecha).format("YYYY-MM-DD");
              const inicio = fechaInicio
                ? fechaInicio.format("YYYY-MM-DD")
                : null;
              const fin = fechaFin ? fechaFin.format("YYYY-MM-DD") : null;

              if (inicio && !fin) return fechaRegistro === inicio;
              if (inicio && fin)
                return fechaRegistro >= inicio && fechaRegistro <= fin;
              return true;
            })
            .map((registro) => (
              <Box key={registro.registro_id} sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  {usuarioSeleccionado.nombre_completo} -{" "}
                  {formatDate(registro.fecha)}
                </Typography>

                {/* INFO TURNO */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    mb: 2,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {[
                      { label: "Turno", value: registro.turno },
                      { label: "Entrada", value: registro.hora_entrada },
                      { label: "Salida", value: registro.hora_salida },
                      {
                        label: "Total horas este día",
                        value: registro.horas_normales,
                      },
                    ].map(({ label, value }) => (
                      <Paper
                        key={label}
                        sx={{ p: 2, backgroundColor: "#f1fcf4", fontSize: 18 }}
                      >
                        {label}: <strong>{value}</strong>
                      </Paper>
                    ))}
                  </Box>

                  {/* CHIPS ESTADO */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                    <Chip
                      label="Aprobado"
                      icon={<DoneIcon sx={{ fontSize: 23 }} />}
                      variant="outlined"
                      sx={{
                        fontSize: 16,
                        fontWeight: "bold",
                        backgroundColor: "#E3FBE3",
                        color: "#3C763D",
                        borderColor: "#3C763D",
                        borderRadius: 4,
                      }}
                    />
                    <Chip
                      label="Pendiente"
                      icon={<PendingActionsIcon sx={{ fontSize: 23 }} />}
                      variant="outlined"
                      sx={{
                        fontSize: 16,
                        fontWeight: "bold",
                        backgroundColor: "#FDF0E1",
                        color: "#f57f17",
                        borderColor: "#f57f17",
                        borderWidth: 2,
                        borderRadius: 4,
                      }}
                    />
                    <Chip
                      label="Denegado"
                      icon={<HighlightOffIcon sx={{ fontSize: 23 }} />}
                      variant="outlined"
                      sx={{
                        fontSize: 16,
                        fontWeight: "bold",
                        backgroundColor: "#FCE4E4",
                        color: "#c62828",
                        borderColor: "#c62828",
                        borderWidth: 2,
                        borderRadius: 4,
                      }}
                    />
                  </Stack>
                </Box>

                {/* TABLA TAREAS REGISTRADAS */}
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{ backgroundColor: "#cff7fb33" }}
                >
                  <Table
                    sx={{
                      minWidth: 650,
                      borderCollapse: "collapse",
                      "& thead th, & tbody td": { borderBottom: "none" },
                    }}
                  >
                    <TableHead>
                      {["Día", "Actividades", "Horas", "Job #", "Class #"].map(
                        (h) => (
                          <TableCell
                            key={h}
                            align="center"
                            sx={{ fontWeight: "bold", fontSize: 18 }}
                          >
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableHead>
                    <TableBody>
                      {registro.tareas_registradas.map((tarea, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ p: 0.5 }} align="start">
                            <Paper sx={{ p: 2, fontSize: 16 }}>
                              {formatDate(registro.fecha)}
                            </Paper>
                          </TableCell>
                          <TableCell sx={{ p: 0.5 }} align="start">
                            <Paper sx={{ p: 2, fontSize: 16 }}>
                              {tarea.descripcion}
                            </Paper>
                          </TableCell>
                          <TableCell sx={{ p: 0.5 }} align="center">
                            <Paper sx={{ p: 2, fontSize: 16 }}>
                              {tarea.horas}
                            </Paper>
                          </TableCell>
                          <TableCell sx={{ p: 0.5 }} align="start">
                            <Paper sx={{ p: 2, fontSize: 16 }}>
                              {tarea.job_number} - {tarea.job_description}
                            </Paper>
                          </TableCell>
                          <TableCell sx={{ p: 0.5 }} align="center">
                            <Paper sx={{ p: 2, fontSize: 16 }}>
                              {tarea.classNumber || "-"}
                            </Paper>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* TABLA TAREA EXTRA */}
                {registro.tarea_extra && (
                  <>
                    <Box sx={{ mt: 2, textAlign: "center" }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Actividad Extra
                      </Typography>
                    </Box>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{ backgroundColor: "#ffe0b233", mt: 1 }}
                    >
                      <Table
                        sx={{
                          minWidth: 650,
                          borderCollapse: "collapse",
                          "& thead th, & tbody td": { borderBottom: "none" },
                        }}
                      >
                        <TableHead>
                          {[
                            "Día",
                            "Actividad",
                            "Horas",
                            "Job #",
                            "Class #",
                          ].map((h) => (
                            <TableCell
                              key={h}
                              align="center"
                              sx={{ fontWeight: "bold", fontSize: 18 }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ p: 0.5 }} align="start">
                              <Paper sx={{ p: 2, fontSize: 16 }}>
                                {formatDate(registro.fecha)}
                              </Paper>
                            </TableCell>
                            <TableCell sx={{ p: 0.5 }} align="start">
                              <Paper sx={{ p: 2, fontSize: 16 }}>
                                {registro.tarea_extra.descripcion}
                              </Paper>
                            </TableCell>
                            <TableCell sx={{ p: 0.5 }} align="center">
                              <Paper sx={{ p: 2, fontSize: 16 }}>
                                {registro.tarea_extra.horas}
                              </Paper>
                            </TableCell>
                            <TableCell sx={{ p: 0.5 }} align="start">
                              <Paper sx={{ p: 2, fontSize: 16 }}>
                                {registro.tarea_extra.job_number} -{" "}
                                {registro.tarea_extra.job_description}
                              </Paper>
                            </TableCell>
                            <TableCell sx={{ p: 0.5 }} align="center">
                              <Paper sx={{ p: 2, fontSize: 16 }}>
                                {registro.tarea_extra.class_number || "-"}
                              </Paper>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
                <Divider sx={{ mt: 5 }} />
              </Box>
            ))
        )}
      </>
    </Box>
  );
};

export default EmpresaPage;
