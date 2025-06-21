import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { useUser } from "../../../context/UserContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

import { exportarPlanillaExcel } from "../../../hooks/exportarPlanillaExcel";

const API = process.env.REACT_APP_API_URL;

const Planillero = () => {
  const { user } = useUser();
  const [data, setData] = useState([]);
  const [fechaInicial, setFechaInicial] = useState(null);
  const [fechaFinal, setFechaFinal] = useState(null);
  const [primeraCarga, setPrimeraCarga] = useState(true);

  useEffect(() => {
    if (user && user.id) {
      if (primeraCarga) {
        fetchDataInicial();
      } else {
        fetchDataPorRango();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicial, fechaFinal, user]);

  const fetchDataInicial = async () => {
    try {
      const res = await fetch(`${API}/data/user/${user.id}/all`);

      const json = await res.json();
      console.log("datos sin filtro", json);

      if (json.success && json.data.length > 0) {
        const ultimaFecha = dayjs(json.data[0].fecha);
        setFechaInicial(ultimaFecha);
        setFechaFinal(ultimaFecha);
        setData(json.data);
      }

      setPrimeraCarga(false);
    } catch (err) {
      console.error("Error fetching data inicial", err);
    }
  };

  const fetchDataPorRango = async () => {
    if (!user || !user.id || !fechaInicial || !fechaFinal) {
      console.warn("Datos incompletos para el filtro.");
      return;
    }

    try {
      const res = await fetch(
        `${API}/data/user/${user.id}/all?fechaInicio=${fechaInicial.format(
          "YYYY-MM-DD"
        )}&fechaFin=${fechaFinal.format("YYYY-MM-DD")}`
      );

      const json = await res.json();
      console.log("datos con filtro", json);

      if (json.success) {
        setData(json.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  const formatDate = (dateStr) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return new Date(dateStr).toLocaleDateString("es-ES", options);
  };

  // AQUI DEBE SER CALCULO DE LA SUMA DE HORAS POR DIA
  // const calcularTotalHoras = () => {
  //   if (!data || data.length === 0) return 0;

  //   return data.reduce((total, registro) => {
  //     if (!registro.descripcion_tarea || !registro.descripcion_tarea.tareas)
  //       return total;
  //     return (
  //       total +
  //       registro.descripcion_tarea.tareas.reduce(
  //         (suma, tarea) => suma + (parseFloat(tarea.horas) || 0),
  //         0
  //       )
  //     );
  //   }, 0);
  // };

  const calcularHorasPorRegistro = (registro) => {
  let total = 0;

  if (
    registro.descripcion_tarea &&
    Array.isArray(registro.descripcion_tarea.tareas)
  ) {
    total += registro.descripcion_tarea.tareas.reduce(
      (suma, tarea) => suma + (parseFloat(tarea.horas) || 0),
      0
    );
  }

  if (registro.extra_horas) {
    total += parseFloat(registro.extra_horas) || 0;
  }

  return total;
};


  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
        <Typography sx={{ fontSize: 25, mt: 2, mb: 2, fontWeight: "bold" }}>
          Actividades de planilla que ha llenado
        </Typography>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <DatePicker
            label="Fecha inicio"
            format="DD/MM/YYYY"
            value={fechaInicial}
            onChange={(newValue) => setFechaInicial(newValue)}
            slotProps={{
              textField: {
                sx: {
                  width: {
                    xs: 190,
                    sm: 190,
                    md: 190,
                    lg: 190,
                    xl: 200,
                  },
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
            value={fechaFinal}
            minDate={fechaInicial}
            onChange={(newValue) => setFechaFinal(newValue)}
            slotProps={{
              textField: {
                sx: {
                  width: {
                    xs: 190,
                    sm: 190,
                    md: 190,
                    lg: 190,
                    xl: 200,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#1976d2",
                  },
                },
              },
            }}
          />

          <Button
            sx={{
              fontSize: {
                xs: 14,
                sm: 12,
                md: 12,
                lg: 13,
                xl: 14,
              },
              height: 55,
              width: 200,
              backgroundColor: "#eefafd",
              color: "#2979ff",
              "&:hover": {
                backgroundColor: "#d5f1f8",
                color: "#2979ff",
              },
            }}
            variant="outlined"
            onClick={() =>
              exportarPlanillaExcel({
                data,
                empleado: `${user?.nombre} ${user?.apellido}`,
                empresa: `${user.nombre_empresa}`,
                fechaInicio: fechaInicial?.format("DD/MM/YYYY"),
                fechaFin: fechaFinal?.format("DD/MM/YYYY"),
              })
            }
          >
            <SystemUpdateAltIcon sx={{ mr: 1 }} /> Descargar Excel
          </Button>
        </Box>
      </LocalizationProvider>

      {data.length === 0 ? (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="h6" color="textSecondary">
            Aún no has registrado tareas.
          </Typography>
        </Box>
      ) : (
        data.map((registro, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            <Box
              sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}
            >
              <Paper
                elevation={1}
                sx={{ padding: 2, backgroundColor: "#13ff0014" }}
              >
                Turno: <strong>{registro.turno}</strong>
              </Paper>
              <Paper
                elevation={1}
                sx={{ padding: 2, backgroundColor: "#13ff0014" }}
              >
                Hora de entrada: <strong>{registro.hora_entrada}</strong>
              </Paper>
              <Paper
                elevation={1}
                sx={{ padding: 2, backgroundColor: "#13ff0014" }}
              >
                Hora de salida: <strong>{registro.hora_salida}</strong>
              </Paper>
            </Box>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ backgroundColor: "#cff7fb33" }}
            >
              <Table
                sx={{
                  minWidth: 650,
                  borderCollapse: "collapse",
                  "& thead th": { borderBottom: "none" },
                  "& tbody td": { borderBottom: "none" },
                }}
                aria-label="simple table"
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        width: 100,
                        fontWeight: "bold",
                        fontSize: {
                          xs: 14,
                          sm: 14,
                          md: 14,
                          lg: 14,
                          xl: 15,
                        },
                      }}
                      align="center"
                    >
                      Día
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 300,
                        fontWeight: "bold",
                        fontSize: {
                          xs: 14,
                          sm: 14,
                          md: 14,
                          lg: 14,
                          xl: 15,
                        },
                      }}
                      align="center"
                    >
                      Actividades
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 50,
                        fontWeight: "bold",
                        fontSize: {
                          xs: 14,
                          sm: 14,
                          md: 14,
                          lg: 14,
                          xl: 15,
                        },
                      }}
                      align="center"
                    >
                      Horas
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 200,
                        fontWeight: "bold",
                        fontSize: {
                          xs: 14,
                          sm: 14,
                          md: 14,
                          lg: 14,
                          xl: 15,
                        },
                      }}
                      align="center"
                    >
                      Jobs #
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 50,
                        fontWeight: "bold",
                        fontSize: {
                          xs: 14,
                          sm: 14,
                          md: 14,
                          lg: 14,
                          xl: 15,
                        },
                      }}
                      align="center"
                    >
                      Class #
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registro.descripcion_tarea?.tareas?.map((tarea, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ padding: 0.5 }} align="start">
                        <Paper
                          elevation={1}
                          sx={{
                            padding: 3,
                            height: 50,
                            display: "flex",
                            alignItems: "center",
                            fontSize: {
                              xs: 15,
                              sm: 15,
                              md: 15,
                              lg: 16,
                              xl: 18,
                            },
                          }}
                        >
                          {formatDate(registro.fecha)}
                        </Paper>
                      </TableCell>
                      <TableCell sx={{ padding: 0.5 }} align="start">
                        <Paper
                          elevation={1}
                          sx={{
                            padding: 3,
                            width: {
                              xs: 400,
                              sm: 400,
                              md: 400,
                              lg: 400,
                              xl: 500,
                            },
                            height: 50,
                            display: "flex",
                            alignItems: "center",
                            fontSize: {
                              xs: 15,
                              sm: 15,
                              md: 15,
                              lg: 16,
                              xl: 18,
                            },
                          }}
                        >
                          {tarea.descripcion}
                        </Paper>
                      </TableCell>
                      <TableCell sx={{ padding: 0.5 }} align="center">
                        <Paper
                          elevation={1}
                          sx={{
                            padding: 3,
                            height: 50,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-around",
                            fontSize: 16,
                          }}
                        >
                          {tarea.horas}
                        </Paper>
                      </TableCell>
                      <TableCell sx={{ padding: 0.5 }} align="start">
                        <Paper
                          elevation={1}
                          sx={{
                            padding: 3,
                            height: 50,
                            width: {
                              xs: 180,
                              sm: 200,
                              lg: 200,
                              xl: 300,
                            },
                            display: "flex",
                            alignItems: "center",
                            fontSize: {
                              xs: 12,
                              sm: 15,
                              md: 15,
                              lg: 15,
                              xl: 18,
                            },
                          }}
                        >
                          {tarea.job_number} - {tarea.job_description}
                        </Paper>
                      </TableCell>
                      <TableCell sx={{ padding: 0.5 }} align="center">
                        <Paper
                          elevation={1}
                          sx={{
                            padding: 3,
                            height: 50,
                            display: "flex",
                            alignItems: "center",
                            fontSize: 16,
                          }}
                        >
                          {tarea.classNumber || "-"}
                        </Paper>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {registro.extra_desc && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 22, fontWeight: "bold", mb: 1 }}>
                  Actividades extras de este día
                </Typography>

                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{ backgroundColor: "#ffe0b233" }}
                >
                  <Table
                    sx={{
                      minWidth: 650,
                      borderCollapse: "collapse",
                      "& thead th": { borderBottom: "none" },
                      "& tbody td": { borderBottom: "none" },
                    }}
                    aria-label="extra table"
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{ width: 100, fontWeight: "bold", fontSize: 16 }}
                          align="center"
                        >
                          Día
                        </TableCell>
                        <TableCell
                          sx={{ width: 300, fontWeight: "bold", fontSize: 16 }}
                          align="center"
                        >
                          Actividad
                        </TableCell>
                        <TableCell
                          sx={{ width: 50, fontWeight: "bold", fontSize: 16 }}
                          align="center"
                        >
                          Horas
                        </TableCell>
                        <TableCell
                          sx={{ width: 200, fontWeight: "bold", fontSize: 16 }}
                          align="center"
                        >
                          Job #
                        </TableCell>
                        <TableCell
                          sx={{ width: 50, fontWeight: "bold", fontSize: 16 }}
                          align="center"
                        >
                          Class #
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ padding: 0.5 }} align="start">
                          <Paper
                            elevation={1}
                            sx={{
                              padding: 3,
                              height: 50,
                              display: "flex",
                              alignItems: "center",
                              fontSize: {
                                xs: 15,
                                sm: 15,
                                md: 15,
                                lg: 16,
                                xl: 18,
                              },
                            }}
                          >
                            {formatDate(registro.fecha)}
                          </Paper>
                        </TableCell>
                        <TableCell sx={{ padding: 0.5 }} align="start">
                          <Paper
                            elevation={1}
                            sx={{
                              padding: 3,
                              height: 50,
                              display: "flex",
                              alignItems: "center",
                              fontSize: {
                                xs: 15,
                                sm: 15,
                                md: 15,
                                lg: 16,
                                xl: 18,
                              },
                            }}
                          >
                            {registro.extra_desc}
                          </Paper>
                        </TableCell>
                        <TableCell sx={{ padding: 0.5 }} align="center">
                          <Paper
                            elevation={1}
                            sx={{
                              padding: 3,
                              height: 50,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-around",
                              fontSize: {
                                xs: 15,
                                sm: 15,
                                md: 15,
                                lg: 16,
                                xl: 18,
                              },
                            }}
                          >
                            {registro.extra_horas}
                          </Paper>
                        </TableCell>
                        <TableCell sx={{ padding: 0.5 }} align="start">
                          <Paper
                            elevation={1}
                            sx={{
                              padding: 3,
                              height: 50,
                              display: "flex",
                              alignItems: "center",
                              fontSize: {
                                xs: 15,
                                sm: 15,
                                md: 15,
                                lg: 16,
                                xl: 18,
                              },
                            }}
                          >
                            {registro.extra_job_number} -{" "}
                            {registro.extra_job_description}
                          </Paper>
                        </TableCell>
                        <TableCell sx={{ padding: 0.5 }} align="center">
                          <Paper
                            elevation={1}
                            sx={{
                              padding: 3,
                              height: 50,
                              display: "flex",
                              alignItems: "center",
                              fontSize: 16,
                            }}
                          >
                            {registro.extra_class || "-"}
                          </Paper>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                marginTop: 2,
                alignItems: "center",
              }}
            >
              {data && data.length > 0 && (
                <Paper
                  elevation={3}
                  sx={{ padding: 2, backgroundColor: "#e0f7fa" }}
                >
                  <Typography variant="h7" fontWeight="bold">
                     Total de horas: {calcularHorasPorRegistro(registro)}
                  </Typography>
                </Paper>
              )}

              <Button
                variant="contained"
                color="primary"
                sx={{ width: 150, height: 54 }}
              >
                Editar tareas
              </Button>
            </Box>
            <Divider sx={{ mt: 5 }} />
          </Box>
        ))
      )}
    </Box>
  );
};

export default Planillero;
