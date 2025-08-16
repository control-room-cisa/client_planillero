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
import type { Empleado } from "../../services/empleadoService";
import type { PlanillaStatus } from "../rrhh/planillaConstants";

interface Props {
  empleado: Empleado;
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
      timeZone: "UTC", // Usar UTC para evitar conversiones de zona horaria
    });
  };

  // Función para formatear la fecha en español
  const formatDateInSpanish = (dateString: string) => {
    const date = new Date(dateString);
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

  // Función para calcular horas normales esperadas
  const calcularHorasNormalesEsperadas = (
    registro: RegistroDiarioData
  ): number => {
    if (registro.esDiaLibre) return 0;

    const entrada = new Date(registro.horaEntrada);
    const salida = new Date(registro.horaSalida);

    // Convertir a minutos para facilitar cálculos
    const entradaMin = entrada.getUTCHours() * 60 + entrada.getUTCMinutes();
    let salidaMin = salida.getUTCHours() * 60 + salida.getUTCMinutes();

    // Si es turno nocturno (entrada > salida), ajustar salida
    if (entradaMin > salidaMin) {
      salidaMin += 24 * 60; // Agregar 24 horas
    }

    // Calcular diferencia en horas
    const horasTrabajo = (salidaMin - entradaMin) / 60;

    // Restar hora de almuerzo si NO es hora corrida
    const horaAlmuerzo = registro.esHoraCorrida ? 0 : 1;

    return Math.max(0, horasTrabajo - horaAlmuerzo);
  };

  // Función para validar traslapes de horas extra
  const validarHorasExtra = (
    registro: RegistroDiarioData
  ): { valido: boolean; errores: string[] } => {
    if (registro.esDiaLibre) return { valido: true, errores: [] };

    const errores: string[] = [];
    const actividadesExtra =
      registro.actividades?.filter((a) => a.esExtra) || [];

    if (actividadesExtra.length === 0) return { valido: true, errores: [] };

    // Obtener horario laboral
    const entrada = new Date(registro.horaEntrada);
    const salida = new Date(registro.horaSalida);
    const entradaMin = entrada.getUTCHours() * 60 + entrada.getUTCMinutes();
    let salidaMin = salida.getUTCHours() * 60 + salida.getUTCMinutes();

    // Si es turno nocturno, ajustar salida
    if (entradaMin > salidaMin) {
      salidaMin += 24 * 60;
    }

    // Validar que las horas extra estén fuera del horario laboral
    for (const act of actividadesExtra) {
      if (!act.horaInicio || !act.horaFin) {
        errores.push(
          `Actividad extra "${act.descripcion}" no tiene horas de inicio/fin`
        );
        continue;
      }

      const inicio = new Date(act.horaInicio);
      const fin = new Date(act.horaFin);
      const inicioMin = inicio.getUTCHours() * 60 + inicio.getUTCMinutes();
      let finMin = fin.getUTCHours() * 60 + fin.getUTCMinutes();

      // Si la actividad cruza medianoche, ajustar
      if (finMin <= inicioMin) {
        finMin += 24 * 60;
      }

      // Verificar que esté completamente fuera del horario laboral
      const estaFuera = finMin <= entradaMin || inicioMin >= salidaMin;
      if (!estaFuera) {
        errores.push(
          `Actividad extra "${act.descripcion}" se traslapa con el horario laboral`
        );
      }
    }

    // Validar que no haya traslapes entre actividades extra
    for (let i = 0; i < actividadesExtra.length; i++) {
      for (let j = i + 1; j < actividadesExtra.length; j++) {
        const act1 = actividadesExtra[i];
        const act2 = actividadesExtra[j];

        if (
          !act1.horaInicio ||
          !act1.horaFin ||
          !act2.horaInicio ||
          !act2.horaFin
        )
          continue;

        const inicio1 = new Date(act1.horaInicio);
        const fin1 = new Date(act1.horaFin);
        const inicio2 = new Date(act2.horaInicio);
        const fin2 = new Date(act2.horaFin);

        const inicio1Min = inicio1.getUTCHours() * 60 + inicio1.getUTCMinutes();
        let fin1Min = fin1.getUTCHours() * 60 + fin1.getUTCMinutes();
        const inicio2Min = inicio2.getUTCHours() * 60 + inicio2.getUTCMinutes();
        let fin2Min = fin2.getUTCHours() * 60 + fin2.getUTCMinutes();

        // Ajustar si cruzan medianoche
        if (fin1Min <= inicio1Min) fin1Min += 24 * 60;
        if (fin2Min <= inicio2Min) fin2Min += 24 * 60;

        // Verificar traslape
        if (!(fin1Min <= inicio2Min || fin2Min <= inicio1Min)) {
          errores.push(
            `Actividades extra "${act1.descripcion}" y "${act2.descripcion}" se traslapan`
          );
        }
      }
    }

    return { valido: errores.length === 0, errores };
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
            const total = normales + extras;
            const disabled = registro.aprobacionRrhh === true;

            // Calcular horas normales esperadas y validar
            const horasNormalesEsperadas =
              calcularHorasNormalesEsperadas(registro);
            const validacionHorasExtra = validarHorasExtra(registro);
            const validacionHorasNormales =
              Math.abs(normales - horasNormalesEsperadas) < 0.1; // Tolerancia de 0.1 horas

            // Determinar si es turno nocturno
            const entrada = new Date(registro.horaEntrada);
            const salida = new Date(registro.horaSalida);
            const entradaMin =
              entrada.getUTCHours() * 60 + entrada.getUTCMinutes();
            const salidaMin =
              salida.getUTCHours() * 60 + salida.getUTCMinutes();
            const esTurnoNocturno = entradaMin > salidaMin;

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
                    {registro.esDiaLibre ? (
                      <Chip label="Día libre" color="info" />
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

                  {/* Validaciones */}
                  {(validacionHorasNormales === false ||
                    !validacionHorasExtra.valido) && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        color="error.main"
                        gutterBottom
                        sx={{ fontWeight: "bold" }}
                      >
                        ⚠️ Errores de validación encontrados
                      </Typography>

                      {!validacionHorasNormales && (
                        <Typography
                          variant="body2"
                          color="error.main"
                          sx={{ mb: 1 }}
                        >
                          📊 Horas normales no coinciden: Registradas:{" "}
                          {normales}h | Esperadas:{" "}
                          {horasNormalesEsperadas.toFixed(2)}h
                        </Typography>
                      )}

                      {!validacionHorasExtra.valido && (
                        <>
                          <Typography
                            variant="body2"
                            color="error.main"
                            sx={{ mb: 1 }}
                          >
                            🕐 Problemas con horas extra:
                          </Typography>
                          {validacionHorasExtra.errores.map((error, idx) => (
                            <Typography
                              key={idx}
                              variant="body2"
                              color="error.main"
                              sx={{ ml: 2, mb: 0.5 }}
                            >
                              • {error}
                            </Typography>
                          ))}
                        </>
                      )}
                    </Box>
                  )}

                  {/* Resumen de horas */}
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Resumen de horas
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={3}
                      alignItems="center"
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Normales:
                        </Typography>
                        <Chip
                          label={`${normales}h`}
                          size="small"
                          variant="outlined"
                          color={validacionHorasNormales ? "default" : "error"}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          (esperadas: {horasNormalesEsperadas.toFixed(2)}h)
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Extras:
                        </Typography>
                        <Chip
                          label={`${extras}h`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          {!validacionHorasExtra.valido && "(con errores)"}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
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
