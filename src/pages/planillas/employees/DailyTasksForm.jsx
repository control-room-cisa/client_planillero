/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, Fragment, useEffect } from "react";
import SelectorRangoFechas from "../../../components/employees/DateRangeSelector";
import {
  Typography,
  Button,
  Stack,
  Paper,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  Divider,
  Fab,
  Chip,
  Alert,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useUser } from "../../../context/UserContext";
import { useDateRange } from "../../../context/DateRangeContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
dayjs.locale("es");

const API = process.env.REACT_APP_API_URL;

const TareasDiarias = () => {
  const { rangoFechas: rango, setRangoFechas: setRango } = useDateRange();
  const [indiceDiaActual, setIndiceDiaActual] = useState(0);
  const [tareasPorDia, setTareasPorDia] = useState({});
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [horaEntrada, setHoraEntrada] = useState(null);
  const [horaSalida, setHoraSalida] = useState(null);
  const [selectJob, setSelectJob] = useState([]);
  const { user } = useUser();
  const [registroExistente, setRegistroExistente] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState(null);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const [tareaExtra, setTareaExtra] = useState({
    descripcion: "",
    horas: "",
    job: "",
  });


  // useEffect(() => {
  //   if (!user) {
  //     navigate("/login");
  //   }
  // }, [user]);

  function handleTurnoChange(turno) {
    setSelectedTurno((prev) => (prev === turno ? null : turno));
  }

  const dias = useMemo(() => {
    if (!rango) return [];
    const inicio = dayjs(rango.inicio);
    const fin = dayjs(rango.fin);
    const lista = [];
    for (
      let f = inicio;
      f.isBefore(fin) || f.isSame(fin);
      f = f.add(1, "day")
    ) {
      lista.push(f.format("YYYY-MM-DD"));
    }
    return lista;
  }, [rango]);

  const fechaActual = dias[indiceDiaActual];

  useEffect(() => {
    const fetchDayData = async () => {
      try {
        const response = await axios.get(
          `${API}/data/user/${user.id}/date/${fechaActual}`
        );
        console.log("response", response);

        if (response.data.success) {
          const dayData = response.data.data;

          const tareasParseadas = dayData.descripcion_tarea?.tareas || [];

          setTareasPorDia((prev) => ({
            ...prev,
            [fechaActual]: tareasParseadas,
          }));

          setSelectedTurno(dayData.turno);
          setHoraEntrada(dayjs(`2000-01-01T${dayData.hora_entrada}`));
          setHoraSalida(dayjs(`2000-01-01T${dayData.hora_salida}`));

          setTareaExtra({
            descripcion: dayData.extra_desc || "",
            horas: dayData.extra_horas || "",
            job: dayData.extra_job || "",
            classNumber: dayData.extra_class || "",
          });

          setRegistroExistente(true);
        } else {
          setRegistroExistente(false);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log("No hay registro para este día.", error);

          setTareasPorDia((prev) => ({
            ...prev,
            [fechaActual]: [],
          }));
          setHoraEntrada(null);
          setHoraSalida(null);
          setTareaExtra({
            descripcion: "",
            horas: "",
            job: "",
            classNumber: "",
          });
          setSelectedTurno(null);
          setRegistroExistente(false);
        } else {
          console.error("Error al cargar tareas:", error);
        }
      }
    };

    if (fechaActual) {
      fetchDayData();
      setIntentoGuardar(false);
    }
  }, [fechaActual]);

  const tareas = useMemo(() => {
    const existentes = tareasPorDia[fechaActual] || [];

    if (existentes.length < 2) {
      return [
        ...existentes,
        ...Array.from({ length: 3 - existentes.length }, () => ({
          descripcion: "",
          horas: "",
          job: "",
          classNumber: "",
          esExtra: false,
        })),
      ];
    }

    return existentes;
  }, [tareasPorDia, fechaActual]);

  const handleChangeTarea = (index, field, value) => {
    if ((field === "horas" || field === "job") && Number(value) < 0) {
      return;
    }

    const nuevas = [...tareas];
    nuevas[index][field] = field === "esExtra" ? value.target.checked : value;
    setTareasPorDia({ ...tareasPorDia, [fechaActual]: nuevas });
  };

  const agregarTarea = () => {
    const nuevasTareas = [
      ...tareas,
      {
        descripcion: "",
        horas: "",
        job: "",
        esExtra: false,
      },
    ];

    setTareasPorDia({
      ...tareasPorDia,
      [fechaActual]: nuevasTareas,
    });
  };

  // const handleHorasExtrasChange = (e) => {
  //   const value = e.target.value;

  //   // Permite números, punto, coma y vacío
  //   if (/^\d*[,.]?\d*$/.test(value)) {
  //     // Reemplaza comas por puntos para consistencia interna
  //     const normalizedValue = value.replace(",", ".");
  //     setHorasExtras(normalizedValue);
  //   }
  // };

  const handleChangeTareaExtra = (field, value) => {
    if (field === "horas") {
      if (/^\d*[,.]?\d*$/.test(value)) {
        const normalizedValue = value.replace(",", ".");
        setTareaExtra((prev) => ({ ...prev, [field]: normalizedValue }));
      }
      return;
    }
    setTareaExtra((prev) => ({ ...prev, [field]: value }));
  };

  const guardarDia = () => {
    console.log("Guardando tareas del día:", fechaActual, tareas);
    setIntentoGuardar(true);
    if (!formularioCompleto) return;

    const nuevasTareasPorDia = { ...tareasPorDia, [fechaActual]: tareas };
    setTareasPorDia(nuevasTareasPorDia);

    enviarFormularioDelDia({
      fecha: fechaActual,
      tareas,
      turno: selectedTurno,
      empresa: user.nombre_empresa,
      usuario_id: user.id,
      empresa_id: user.empresa_id,
      nombre: `${user.nombre} ${user.apellido}`,
      fechaInicio: rango?.inicio,
      fechaFin: rango?.fin,
      horaEntrada,
      horaSalida,
    });

    avanzar();
  };

  const avanzar = () => {
    if (indiceDiaActual < dias.length - 1)
      setIndiceDiaActual(indiceDiaActual + 1);
  };

  const retroceder = () => {
    if (indiceDiaActual > 0) setIndiceDiaActual(indiceDiaActual - 1);
  };

  const totalHorasNormales = useMemo(
    () =>
      tareas
        .filter((t) => !t.esExtra)
        .reduce((acc, t) => acc + Number(t.horas || 0), 0),
    [tareas]
  );

  const calcularHorasPermitidas = () => {
    if (!horaEntrada || !horaSalida) return null;

    const entrada = dayjs(horaEntrada);
    let salida = dayjs(horaSalida);

    // Si la hora de salida es anterior a la de entrada, asumimos que es al día siguiente
    if (salida.isBefore(entrada)) {
      salida = salida.add(1, "day");
    }

    const diferencia = salida.diff(entrada, "hour", true);
    return diferencia;
  };

  const horasPermitidas = calcularHorasPermitidas();
  const horasExcedidas = totalHorasNormales > horasPermitidas;
  const horasRestantes = Math.max(horasPermitidas - totalHorasNormales, 0);

  const tareasValidas = tareas.filter((t) => t.descripcion && t.horas && t.job);

  const formularioCompleto =
    selectedTurno &&
    horaEntrada &&
    horaSalida &&
    tareasValidas.length >= 2 &&
    !horasExcedidas &&
    horasRestantes === 0;

  const obtenerErroresFormulario = () => {
    const errores = [];

    if (!selectedTurno) errores.push("Debe seleccionar un turno.");
    if (!horaEntrada || !horaSalida)
      errores.push("Debe seleccionar hora de entrada y salida.");
    if (tareasValidas.length < 2)
      errores.push("Debe registrar al menos dos tareas completas.");
    if (horasExcedidas)
      errores.push(
        `Se están excediendo las horas permitidas: ${horasPermitidas}`
      );
    if (horasRestantes > 0)
      errores.push(`Faltan ${horasRestantes} horas por completar.`);

    return errores;
  };

  const enviarFormularioDelDia = async ({
    fecha,
    tareas,
    turno,
    empresa,
    usuario_id,
    empresa_id,
    nombre,
    fechaInicio,
    fechaFin,
    horaEntrada,
    horaSalida,
  }) => {
    try {
      // info del job
      const tareasConDetalles = tareas.map((t) => {
        const jobInfo = selectJob.find((j) => j.id === t.job) || {};
        return {
          ...t,
          job_id: t.job || null,
          job_number: jobInfo.job_number || null,
          job_description: jobInfo.job_description || null,
        };
      });

      const horasNormales = tareasConDetalles
        .filter((t) => !t.esExtra)
        .reduce((acc, t) => acc + Number(t.horas || 0), 0);

      const esUltimoDia =
      dayjs(fecha).isSame(dayjs(rango.fin), "day");

      const payload = {
        nombre,
        empresa,
        usuario_id,
        empresa_id,
        turno,
        fecha,
        fechaInicio,
        fechaFin: esUltimoDia ? rango.fin : fecha,
        tareas: tareasConDetalles,
        tareaExtra,
        horasNormales,
        horaEntrada: horaEntrada ? dayjs(horaEntrada).format("HH:mm") : null,
        horaSalida: horaSalida ? dayjs(horaSalida).format("HH:mm") : null,
      };

      console.log("tarea diaria enriquecida:", payload);

      const response = await axios.post(`${API}/save/data`, payload);

      if (response.status === 200) {
        console.log("Registro guardado correctamente");

        const mensaje = registroExistente
          ? "Registro actualizado correctamente"
          : "Registro guardado correctamente";

        setMensajeAlerta(mensaje);
        window.scrollTo({ top: 0, behavior: "smooth" });

        setTimeout(() => {
          setMensajeAlerta(null);
        }, 8000);
      } else {
        console.warn("Algo salió mal:", response.data);
      }
    } catch (error) {
      console.error(`Error al enviar el día ${fecha}:`, error);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${API}/customers/job`);
        console.log("job", response);

        setSelectJob(response.data);
      } catch (error) {
        console.error("Error al cargar los jobs:", error.message);
      }
    };

    fetchJobs();
  }, []);

  if (!user) return null;

  return (
    <Box px={2} py={3} maxWidth="lg" mx="auto">
      <SelectorRangoFechas
        fechaInicial={rango?.inicio ? dayjs(rango.inicio) : null}
        fechaFinal={rango?.fin ? dayjs(rango.fin) : null}
        onConfirmarRango={(nuevoRango) => {
          setRango(nuevoRango);
          setIndiceDiaActual(0);
          setTareasPorDia({});
        }}
      />
      {mensajeAlerta && (
        <Alert
          severity="success"
          onClose={() => setMensajeAlerta(null)}
          sx={{ mt: 4, mb: 4, fontSize: "1rem", fontWeight: "bold" }}
        >
          {mensajeAlerta}
        </Alert>
      )}
      {rango && (
        <>
          <Grid
            container
            spacing={5}
            mb={3}
            mt={3}
            alignItems="center"
            justifyContent={{ xs: "center", md: "start" }}
          >
            <Grid
              item
              xs={12}
              md="auto"
              textAlign={{ xs: "center", md: "left" }}
            >
              <Typography fontWeight="bold" fontSize={20}>
                Hoja de tiempo
              </Typography>
            </Grid>
            <Grid item xs={12} md="auto" textAlign="center">
              <Typography fontWeight="bold" fontSize={20}>
                Empresa: {user.nombre_empresa}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Grid
            container
            spacing={3}
            mb={3}
            alignItems="center"
            justifyContent={{ xs: "center", md: "space-between" }}
          >
            <Grid item xs={12} md={4}>
              <Box
                textAlign="center"
                minHeight={80}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography fontWeight="bold" fontSize={20}>
                  Nombre:{" "}
                  {`${user.nombre} ${user.apellido}`
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={2} alignItems="start">
                <Typography fontWeight="bold" fontSize={20}>
                  Fecha inicial: {dayjs(rango.inicio).format("DD/MM/YYYY")}
                </Typography>
                <Typography fontWeight="bold" fontSize={20}>
                  Fecha final: {dayjs(rango.fin).format("DD/MM/YYYY")}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack spacing={1} alignItems="start">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTurno === "dia"}
                      onChange={() => handleTurnoChange("dia")}
                    />
                  }
                  label="Turno día"
                  sx={{ "& .MuiTypography-root": { fontSize: "1.1rem" } }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTurno === "noche"}
                      onChange={() => handleTurnoChange("noche")}
                    />
                  }
                  label="Turno noche"
                  sx={{ "& .MuiTypography-root": { fontSize: "1.1rem" } }}
                />
              </Stack>
            </Grid>
          </Grid>

          <Typography variant="h5" textAlign="center">
            <EditIcon></EditIcon> En el siguiente formulario debe llenar sus
            tareas diarias..
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            justifyContent="space-between"
            mb={1}
            mt={2}
            sx={{
              width: "100%",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={retroceder}
              disabled={indiceDiaActual === 0}
              sx={{
                minWidth: "50%",
                flex: 1,
                order: { xs: 1, sm: 0 },
                fontWeight: "bold",
                backgroundColor: "#e5fffb",
                color: "#15C174",
              }}
            >
              ← Dia anterior
            </Button>

            <Button
              onClick={avanzar}
              disabled={indiceDiaActual === dias.length - 1}
              sx={{
                minWidth: "45%",
                flex: 1,
                order: { xs: 2, sm: 0 },
                fontWeight: "bold",
                backgroundColor: "#e5fffb",
                color: "#15C174",
              }}
            >
              Siguiente dia →
            </Button>
          </Stack>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container direction="column" spacing={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Grid container spacing={2} justifyContent="space-between">
                  <Box
                    textAlign="center"
                    minHeight={50}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography sx={{ fontWeight: "bold", fontSize: "1.3rem" }}>
                      {dayjs(fechaActual).format("dddd DD/MM/YYYY")}
                    </Typography>
                  </Box>

                  <Grid item xs={12} md={6}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Hora de entrada</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <TimePicker
                          sx={{
                            width: {
                              xs: "150px",
                              sm: "150px",
                              md: "200px",
                              lg: "200px",
                              xl: "300px",
                            },
                          }}
                          value={horaEntrada}
                          onChange={(newValue) => setHoraEntrada(newValue)}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Hora de salida</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <TimePicker
                          sx={{
                            width: {
                              xs: "150px",
                              sm: "150px",
                              md: "200px",
                              lg: "200px",
                              xl: "300px",
                            },
                          }}
                          value={horaSalida}
                          onChange={(newValue) => setHoraSalida(newValue)}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </LocalizationProvider>
              <Divider />

              {tareas.map((tarea, index) => (
                <Fragment key={index}>
                  <Grid item>
                    <Grid container spacing={1} justifyContent="space-between">
                      <Grid item xs={12} md={6}>
                        <TextField
                          label={`Descripción de tarea ${index + 1}`}
                          value={tarea.descripcion}
                          onChange={(e) =>
                            handleChangeTarea(
                              index,
                              "descripcion",
                              e.target.value
                            )
                          }
                          multiline
                          rows={3}
                          fullWidth
                          sx={{
                            width: {
                              xs: "130%",
                              sm: "100px",
                              md: "300px",
                              lg: "300px",
                              xl: "400px",
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField
                          label="Horas dedicadas"
                          type="number"
                          value={tarea.horas}
                          onChange={(e) =>
                            handleChangeTarea(index, "horas", e.target.value)
                          }
                          fullWidth
                          sx={{
                            width: {
                              xs: "70%",
                              sm: "100px",
                              md: "170px",
                              lg: "170px",
                              xl: "200px",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Autocomplete
                          options={selectJob}
                          groupBy={(option) => option.company_name}
                          getOptionLabel={(option) =>
                            `${option.job_number} - ${option.job_description}`
                          }
                          value={
                            selectJob.find((job) => job.id === tarea.job) ||
                            null
                          }
                          onChange={(e, newValue) =>
                            handleChangeTarea(
                              index,
                              "job",
                              newValue ? newValue.id : ""
                            )
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Job #" fullWidth />
                          )}
                          renderGroup={(params) => (
                            <li key={params.key}>
                              <Divider sx={{ mt: 1, mb: 0.5 }} />
                              <strong style={{ paddingLeft: 10 }}>
                                {params.group}
                              </strong>
                              <ul style={{ marginTop: 4 }}>
                                {params.children}
                              </ul>
                            </li>
                          )}
                          ListboxProps={{
                            sx: {
                              "& .MuiAutocomplete-option:hover": {
                                backgroundColor: "#e0f7fa",
                                color: "#00695c",
                              },
                            },
                          }}
                          sx={{
                            width: {
                              xs: "220%",
                              sm: "200px",
                              md: "250px",
                              lg: "250px",
                              xl: "300px",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <TextField
                          label="Class #"
                          value={tarea.classNumber}
                          onChange={(e) =>
                            handleChangeTarea(
                              index,
                              "classNumber",
                              e.target.value
                            )
                          }
                          fullWidth
                          sx={{
                            width: {
                              xs: "100%",
                              sm: "150px",
                              md: "150px",
                              lg: "150px",
                              xl: "150px",
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  {index < tareas.length - 1 && <Divider sx={{ my: 2 }} />}
                </Fragment>
              ))}

              <Divider />

              {/* Horas extras */}
              <Grid item>
                <Typography marginBottom={2} fontWeight="bold">
                  <EditIcon></EditIcon>Actividades de horas extras.
                </Typography>
                <Grid container spacing={1} justifyContent="space-between">
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Descripción de tarea extra"
                      value={tareaExtra.descripcion}
                      onChange={(e) =>
                        handleChangeTareaExtra("descripcion", e.target.value)
                      }
                      multiline
                      rows={3}
                      fullWidth
                      sx={{
                        width: {
                          xs: "130%",
                          sm: "100px",
                          md: "350px",
                          lg: "350px",
                          xl: "400px",
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Horas extras</Typography>
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <TextField
                          type="number"
                          value={tareaExtra.horas}
                          onChange={(e) =>
                            handleChangeTareaExtra("horas", e.target.value)
                          }
                          fullWidth
                          sx={{
                            width: {
                              xs: "70%",
                              sm: "100px",
                              md: "150px",
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Autocomplete
                      options={selectJob}
                      groupBy={(option) => option.company_name}
                      getOptionLabel={(option) =>
                        `${option.job_number} - ${option.job_description}`
                      }
                      value={
                        selectJob.find((job) => job.id === tareaExtra.job) ||
                        null
                      }
                      onChange={(e, newValue) =>
                        handleChangeTareaExtra(
                          "job",
                          newValue ? newValue.id : ""
                        )
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Job" fullWidth />
                      )}
                      renderGroup={(params) => (
                        <li key={params.key}>
                          <Divider sx={{ mt: 1, mb: 0.5 }} />
                          <strong style={{ paddingLeft: 10 }}>
                            {params.group}
                          </strong>
                          <ul style={{ marginTop: 4 }}>{params.children}</ul>
                        </li>
                      )}
                      ListboxProps={{
                        sx: {
                          "& .MuiAutocomplete-option:hover": {
                            backgroundColor: "#e0f7fa",
                            color: "#00695c",
                          },
                        },
                      }}
                      sx={{
                        width: {
                          xs: "300%",
                          sm: "250px",
                          md: "250px",
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Divider />

              <Grid
                container
                spacing={2}
                direction="row"
                alignItems="center"
                justifyContent="space-evenly"
                columnSpacing={{ xs: 5, md: 12, lg: 15 }}
              >
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography
                      variant="h7"
                      color="text.secondary"
                      fontWeight="bold"
                    >
                      Total horas normales
                    </Typography>
                    <Chip
                      label={`${totalHorasNormales} horas`}
                      variant="outlined"
                      color={horasExcedidas ? "error" : "success"}
                      sx={{
                        fontSize: "1.4rem",
                        fontWeight: "bold",
                        padding: 2,
                        width: 200,
                        borderColor: "#15C174",
                        borderWidth: 2,
                        borderStyle: "solid",
                        "&.MuiChip-outlined": {
                          borderWidth: 2,
                        },
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Fab
                    variant="extended"
                    color="success"
                    onClick={guardarDia}
                    disabled={!formularioCompleto}
                    sx={{
                      fontSize: {
                        xs: "1rem",
                        sm: "1rem",
                        md: "1.2rem",
                      },
                      px: {
                        xs: 2,
                        sm: 3,
                        md: 4,
                      },
                      py: 1.5,
                      textTransform: "none",
                    }}
                  >
                    <SaveIcon
                      sx={{
                        fontSize: {
                          xs: "1.3rem",
                          sm: "1.5rem",
                          md: "1.5rem",
                        },
                        mr: 1,
                      }}
                    />
                    {registroExistente
                      ? "Actualizar tareas de este día"
                      : "Guardar tareas de este día"}
                  </Fab>
                </Grid>

                {intentoGuardar &&
                  !formularioCompleto &&
                  obtenerErroresFormulario().map((error, index) => (
                    <Grid item xs={12} key={index}>
                      <Alert
                        severity="warning"
                        sx={{ fontSize: "1rem", fontWeight: "bold" }}
                      >
                        {error}
                      </Alert>
                    </Grid>
                  ))}

                  {horasExcedidas && (
                  <Grid item xs={12}>
                    <Alert
                      severity="error"
                      sx={{ fontSize: "1rem", fontWeight: "bold" }}
                    >
                      ¡Atención! Estás excediendo las horas normales permitidas
                      según tu rango horario para este dia ({horasPermitidas}{" "}
                      horas). Revisa tus tareas.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Paper>

          <Grid
            container
            spacing={2}
            alignItems="center"
            justifyContent="center"
          >
            <Button
              variant="contained"
              color="primary"
              onClick={agregarTarea}
              disabled={tareas.length >= 8}
              sx={{
                fontSize: {
                  xs: "1rem",
                  sm: "1rem",
                  md: "1.15rem",
                },
                py: 1.5,
                textTransform: "none",
                "&:hover": {
                  transform: "scale(1.02)",
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <AddIcon fontSize="medium" />
                <span>Agregar más tareas a este dia</span>
              </Box>
            </Button>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default TareasDiarias;
