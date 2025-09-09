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

  const calcularHorasNormalesEsperadas = (
    registro: RegistroDiarioData
  ): number => {
    if (registro.esDiaLibre) return 0;

    const entrada = new Date(registro.horaEntrada);
    const salida = new Date(registro.horaSalida);

    const entradaMin = entrada.getUTCHours() * 60 + entrada.getUTCMinutes();
    let salidaMin = salida.getUTCHours() * 60 + salida.getUTCMinutes();

    if (entradaMin > salidaMin) {
      salidaMin += 24 * 60; // cruza medianoche
    }

    const horasTrabajo = (salidaMin - entradaMin) / 60;
    const horaAlmuerzo = registro.esHoraCorrida ? 0 : 1;

    return Math.max(0, horasTrabajo - horaAlmuerzo);
  };

  const validarHorasExtra = (
    registro: RegistroDiarioData
  ): { valido: boolean; errores: string[] } => {
    if (registro.esDiaLibre) return { valido: true, errores: [] };

    const errores: string[] = [];
    const actividadesExtra =
      registro.actividades?.filter((a) => a.esExtra) || [];

    if (actividadesExtra.length === 0) return { valido: true, errores: [] };

    const entrada = new Date(registro.horaEntrada);
    const salida = new Date(registro.horaSalida);
    const entradaMin = entrada.getUTCHours() * 60 + entrada.getUTCMinutes();
    let salidaMin = salida.getUTCHours() * 60 + salida.getUTCMinutes();
    if (entradaMin > salidaMin) salidaMin += 24 * 60;

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
      if (finMin <= inicioMin) finMin += 24 * 60;

      const estaFuera = finMin <= entradaMin || inicioMin >= salidaMin;
      if (!estaFuera) {
        errores.push(
          `Actividad extra "${act.descripcion}" se traslapa con el horario laboral`
        );
      }
    }

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

        if (fin1Min <= inicio1Min) fin1Min += 24 * 60;
        if (fin2Min <= inicio2Min) fin2Min += 24 * 60;

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
      <Box sx={{ p: 2, overflowX: "hidden" }}>
        <Typography
          marginLeft={4}
          variant="h5"
          color="primary"
          fontWeight="bold"
          gutterBottom
        >
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

            // Validaciones
            const horasNormalesEsperadas =
              calcularHorasNormalesEsperadas(registro);
            const validacionHorasExtra = validarHorasExtra(registro);
            const validacionHorasNormales =
              Math.abs(normales - horasNormalesEsperadas) < 0.1;
            const tieneErrores =
              !validacionHorasNormales || !validacionHorasExtra.valido;

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
                        .sort((a, b) =>
                          a.esExtra === b.esExtra ? 0 : a.esExtra ? 1 : -1
                        )
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
                                sx={{
                                  fontWeight: 600,
                                  wordBreak: "break-word",
                                }}
                              >
                                {act.descripcion}
                              </Typography>

                              {/* Horas (en su propia línea) */}
                              <Chip
                                label={`${(act.duracionHoras || 0).toFixed(
                                  2
                                )}h`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />

                              {/* Horario de la actividad (si aplica) */}
                              <Typography variant="caption" color="text.secondary">
                                {act.horaInicio && act.horaFin
                                  ? `${formatTimeCorrectly(act.horaInicio)} - ${formatTimeCorrectly(act.horaFin)}`
                                  : ""}
                              </Typography>

                              {/* Job y código (cada cosa en su línea si prefieres, aquí van juntos en texto) */}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ wordBreak: "break-word" }}
                              >
                                {(act.job?.codigo || "") +
                                  (act.job?.nombre
                                    ? ` • ${act.job?.nombre}`
                                    : "")}
                              </Typography>

                              {/* Tipo y clase en columna (uno debajo del otro) */}
                              <Stack
                                direction="column"
                                spacing={0.5}
                                sx={{ width: "50%" }}
                              >
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
                            <TableCell>Horario</TableCell>
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
                                key={
                                  act.id ?? `${act.jobId}-${act.descripcion}`
                                }
                              >
                                <TableCell
                                  sx={{
                                    maxWidth: 520,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {act.descripcion}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${(act.duracionHoras || 0).toFixed(
                                      2
                                    )}h`}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  {act.horaInicio && act.horaFin
                                    ? `${formatTimeCorrectly(act.horaInicio)} - ${formatTimeCorrectly(act.horaFin)}`
                                    : "-"}
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

                  {/* Validaciones */}
                  {tieneErrores && (
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
                          {validacionHorasExtra.errores.map((error, i) => (
                            <Typography
                              key={i}
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
                        {!validacionHorasExtra.valido && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            (con errores)
                          </Typography>
                        )}
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
                            label={tieneErrores ? "Con errores" : "Aprobado"}
                            color={tieneErrores ? "error" : "success"}
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
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: "break-word" }}
                      >
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
