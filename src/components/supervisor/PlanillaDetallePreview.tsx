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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Autocomplete,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  TableContainer,
} from "@mui/material";
import {
  Edit as EditIcon,
  DarkMode as DarkModeIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import RegistroDiarioService from "../../services/registroDiarioService";
import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import type { HorarioTrabajoDto } from "../../dtos/calculoHorasTrabajoDto";
import type {
  RegistroDiarioData,
  ActividadData,
} from "../../dtos/RegistrosDiariosDataDto";
import type { Empleado } from "../../services/empleadoService";
import type { PlanillaStatus } from "../rrhh/planillaConstants";
import ymdInTZ from "../../utils/timeZone";
import JobService from "../../services/jobService";

interface Props {
  empleado: Empleado;
  startDate: Date | null;
  endDate: Date | null;
  status: PlanillaStatus;
}

type JobConJerarquia = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  empresa?: { nombre: string };
  especial?: boolean;
  indentLevel: number;
  parentCodigo?: string | null;
};

const PlanillaDetallePreviewSupervisor: React.FC<Props> = ({
  empleado,
  startDate,
  endDate,
  status,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [registros, setRegistros] = useState<RegistroDiarioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Estados para el diálogo de rechazo
  const [rechazoDialogOpen, setRechazoDialogOpen] = useState(false);
  const [registroIdRechazar, setRegistroIdRechazar] = useState<number | null>(
    null
  );
  const [comentarioRechazo, setComentarioRechazo] = useState("");
  const [errorComentario, setErrorComentario] = useState("");

  // Estados para el modal de edición de actividad
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<JobConJerarquia[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobConJerarquia | null>(null);
  const [editedDescripcion, setEditedDescripcion] = useState("");
  // Mapa fecha -> tipoHorario (H1, H2, ...)
  const [horariosByFecha, setHorariosByFecha] = useState<
    Record<string, string>
  >({});
  // Mapa fecha -> horas normales esperadas (del backend)
  const [expectedHoursByFecha, setExpectedHoursByFecha] = useState<
    Record<string, number>
  >({});

  // Para saber qué registro/actividad se está editando
  const [targetRegistro, setTargetRegistro] =
    useState<RegistroDiarioData | null>(null);
  const [targetActividad, setTargetActividad] = useState<ActividadData | null>(
    null
  );

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

      // Cargar tipo de horario por fecha para condicionar chips (Hora Corrida solo H2)
      const horarios: Array<HorarioTrabajoDto | null> = await Promise.all(
        days.map((fecha) =>
          CalculoHorasTrabajoService.getHorarioTrabajo(empleado.id, fecha)
            .then((h) => h)
            .catch(() => null)
        )
      );
      const byFecha: Record<string, string> = {};
      const byFechaHours: Record<string, number> = {};
      for (const h of horarios) {
        if (h?.fecha) {
          byFecha[h.fecha] = h.tipoHorario;
          if (typeof h.cantidadHorasLaborables === "number") {
            byFechaHours[h.fecha] = h.cantidadHorasLaborables;
          }
        }
      }
      setHorariosByFecha(byFecha);
      setExpectedHoursByFecha(byFechaHours);

      // Construir lista alineada a todas las fechas del período, insertando placeholders
      const registrosByFecha = new Map<string, RegistroDiarioData | null>();
      results.forEach((r, i) => {
        const key = days[i];
        registrosByFecha.set(key, r);
      });

      const aligned: RegistroDiarioData[] = days
        .map((fecha) => {
          const r = registrosByFecha.get(fecha);
          if (r) return r as RegistroDiarioData;
          // Placeholder sin información
          return {
            id: undefined as any,
            fecha,
            horaEntrada: "",
            horaSalida: "",
            jornada: "D",
            esDiaLibre: false,
            esHoraCorrida: false,
            comentarioEmpleado: "",
            actividades: [],
            aprobacionSupervisor: undefined,
            aprobacionRrhh: undefined,
          } as any as RegistroDiarioData;
        })
        .filter((r) => {
          // Mostrar días vacíos solo cuando el filtro es "Pendiente"
          if (!r.id) return status === "Pendiente";
          switch (status) {
            case "Pendiente":
              return r.aprobacionSupervisor == null;
            case "Aprobado":
              return r.aprobacionSupervisor === true;
            case "Rechazado":
              return r.aprobacionSupervisor === false;
          }
        });
      setRegistros(aligned);
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

  const loadJobs = async (
    includeSpecial: boolean
  ): Promise<JobConJerarquia[]> => {
    try {
      setLoadingJobs(true);
      // Pasar el empleadoId para filtrar por empresa del departamento del empleado
      const jobsData = await JobService.getAll(empleado.id);
      const jobsActivos = jobsData.filter((j: any) => j.activo === true);

      const base = includeSpecial
        ? jobsActivos
        : jobsActivos.filter((j: any) => !j.especial);

      const jobMap = new Map(base.map((j: any) => [j.codigo, j]));
      const jobsConJerarquia: JobConJerarquia[] = base.map((j: any) => {
        const parts = (j.codigo || "").split(".");
        const indentLevel = Math.max(0, parts.length - 1);
        const padreCodigo =
          indentLevel > 0 ? parts.slice(0, -1).join(".") : null;
        const parentJob = padreCodigo ? jobMap.get(padreCodigo) : null;
        return { ...j, indentLevel, parentCodigo: parentJob?.codigo || null };
      });

      setJobs(jobsConJerarquia);
      return jobsConJerarquia;
    } catch (e) {
      console.error("Error al cargar jobs:", e);
      setSnackbar({
        open: true,
        message: "Error al cargar la lista de jobs",
        severity: "error",
      });
      return [];
    } finally {
      setLoadingJobs(false);
    }
  };

  const openJobDialog = async (
    registro: RegistroDiarioData,
    actividad: ActividadData
  ) => {
    setTargetRegistro(registro);
    setTargetActividad(actividad);
    setEditedDescripcion(actividad.descripcion || "");

    // Solo incluir especiales cuando la actividad NO es extra
    const list = await loadJobs(!(actividad.esExtra === true));
    const currentJobId =
      (actividad.job && actividad.job.id) ??
      (typeof actividad.jobId === "number" ? actividad.jobId : undefined);

    const pre =
      currentJobId != null ? list.find((j) => j.id === currentJobId) : null;
    setSelectedJob(pre ?? null);

    setJobDialogOpen(true);
  };

  const closeJobDialog = () => {
    setJobDialogOpen(false);
    setSelectedJob(null);
    setEditedDescripcion("");
    setTargetActividad(null);
    setTargetRegistro(null);
  };

  const saveJobChange = async () => {
    if (!targetRegistro || !targetActividad || !selectedJob) {
      setSnackbar({
        open: true,
        message: "Selecciona un Job válido",
        severity: "error",
      });
      return;
    }
    if (!targetActividad.id) {
      setSnackbar({
        open: true,
        message: "La actividad no tiene id; no se puede actualizar",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    try {
      // Usar el nuevo método específico para supervisores
      await RegistroDiarioService.updateJobBySupervisor(
        empleado.id,
        targetActividad.id,
        selectedJob.id,
        editedDescripcion
      );

      setSnackbar({
        open: true,
        message: "Actividad actualizada correctamente",
        severity: "success",
      });
      closeJobDialog();
      await fetchRegistros();
    } catch (err) {
      console.error("Error al actualizar Job:", err);
      setSnackbar({
        open: true,
        message: "Error al actualizar el Job",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

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
    setRegistroIdRechazar(id);
    setComentarioRechazo("");
    setErrorComentario("");
    setRechazoDialogOpen(true);
  };

  const handleCloseRechazoDialog = () => {
    setRechazoDialogOpen(false);
    setRegistroIdRechazar(null);
    setComentarioRechazo("");
    setErrorComentario("");
  };

  const handleConfirmarRechazo = () => {
    if (!comentarioRechazo.trim()) {
      setErrorComentario("El comentario es obligatorio");
      return;
    }

    if (!registroIdRechazar) return;

    RegistroDiarioService.aprobarSupervisor(
      registroIdRechazar,
      false,
      undefined,
      comentarioRechazo.trim()
    )
      .then(() => {
        setSnackbar({
          open: true,
          message: "Registro rechazado",
          severity: "success",
        });
        fetchRegistros();
        handleCloseRechazoDialog();
      })
      .catch((err) => {
        console.error("Reject error:", err);
        setSnackbar({
          open: true,
          message: "Error al rechazar",
          severity: "error",
        });
      });
  };

  const TZ = "America/Tegucigalpa";
  const parseHNT = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const hasTZ = /Z$|[+\-]\d{2}:?\d{2}$/i.test(dateString);
    const iso = hasTZ
      ? dateString
      : `${dateString}${dateString.includes("T") ? "" : "T00:00:00"}-06:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatTimeCorrectly = (dateString: string) => {
    if (!dateString) return "-";
    const localDate = parseHNT(dateString);
    if (!localDate) return "-";
    return new Intl.DateTimeFormat("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }).format(localDate);
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
    // Regla: (salida - entrada) - 1h de almuerzo cuando NO es hora corrida
    const entrada = parseHNT(registro.horaEntrada);
    const salida = parseHNT(registro.horaSalida);
    if (!entrada || !salida) return 0;

    const entradaMin = entrada.getHours() * 60 + entrada.getMinutes();
    let salidaMin = salida.getHours() * 60 + salida.getMinutes();

    // Si entrada === salida, no hay horas normales esperadas
    if (entradaMin === salidaMin) return 0;

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

    // Si entrada === salida, no hay horario laboral, no validar traslape
    const hayHorarioLaboral = entradaMin !== salidaMin;

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
      // Validar que la duración coincide con diferencia de tiempos
      const duracionCalculada = (finMin - inicioMin) / 60;
      if (Math.abs(act.duracionHoras - duracionCalculada) > 0.01) {
        errores.push(
          `Actividad extra "${
            act.descripcion
          }" debe durar ${duracionCalculada.toFixed(2)}h (fin - inicio)`
        );
      }

      // Solo validar traslape con horario laboral si existe horario laboral
      if (hayHorarioLaboral) {
        const estaFuera = finMin <= entradaMin || inicioMin >= salidaMin;
        if (!estaFuera) {
          errores.push(
            `Actividad extra "${act.descripcion}" se traslapa con el horario laboral`
          );
        }
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

  // Calcula duración (en horas) a partir de horaInicio/horaFin en TZ local,
  // considerando cruces de medianoche. Devuelve null si no es posible calcular.
  const computeHoursFromTimes = (
    horaInicio?: string,
    horaFin?: string
  ): number | null => {
    if (!horaInicio || !horaFin) return null;
    const inicioHM = formatTimeCorrectly(horaInicio); // HH:mm
    const finHM = formatTimeCorrectly(horaFin); // HH:mm
    const [ih, im] = inicioHM.split(":").map(Number);
    const [fh, fm] = finHM.split(":").map(Number);
    if (
      !Number.isFinite(ih) ||
      !Number.isFinite(im) ||
      !Number.isFinite(fh) ||
      !Number.isFinite(fm)
    ) {
      return null;
    }
    const inicioMin = ih * 60 + im;
    let finMin = fh * 60 + fm;
    if (finMin <= inicioMin) finMin += 24 * 60; // cruza medianoche o es igual
    return Math.round(((finMin - inicioMin) / 60) * 100) / 100;
  };

  // Obtiene horas de la actividad con regla: extras siempre de fin - inicio.
  const getActividadHoras = (act: any): number | null => {
    if (act?._synthetic) {
      const v = Number(act.duracionHoras);
      return Number.isFinite(v) ? v : null;
    }
    if (act?.esExtra) {
      return computeHoursFromTimes(act.horaInicio, act.horaFin);
    }
    const v = Number(act?.duracionHoras);
    return Number.isFinite(v) ? v : null;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header fijo sin scroll (solo progress, altura mínima) */}
        <Box sx={{ p: 0, flexShrink: 0 }}>
          <Box sx={{ height: 2, mb: 0 }}>
            {loading && (
              <LinearProgress
                sx={{ transition: "opacity 0.5s", opacity: loading ? 1 : 0 }}
              />
            )}
          </Box>
        </Box>

        {/* Contenedor con scroll para los registros */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: { xs: 2, md: 3 },
            pb: { xs: 2, md: 3 },
          }}
        >
          <Stack spacing={2}>
            {registros.map((registro, idx) => {
              const normales =
                registro.actividades
                  ?.filter((a) => !a.esExtra)
                  .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
              const extras =
                registro.actividades
                  ?.filter((a) => a.esExtra && !a.esCompensatorio)
                  .reduce((s, a: any) => s + (getActividadHoras(a) ?? 0), 0) ??
                0;
              const total = normales + extras;
              const disabled = registro.aprobacionRrhh === true;

              const horasNormalesEsperadas =
                calcularHorasNormalesEsperadas(registro);
              const validacionHorasExtra = validarHorasExtra(registro);
              // Si no hay horas normales esperadas, solo validar que no haya horas normales registradas
              const validacionHorasNormales =
                horasNormalesEsperadas === 0
                  ? normales === 0
                  : Math.abs(normales - horasNormalesEsperadas) < 0.1;

              // Validación de incapacidad: no puede haber horas laborables
              const validacionIncapacidad =
                registro.esIncapacidad === true
                  ? normales === 0 && extras === 0
                  : true;

              // Validación E01: no puede haber actividades con job código "E01" (Job desconocido)
              const tieneJobE01 =
                registro.actividades?.some(
                  (act) => act.job?.codigo?.toUpperCase() === "E01"
                ) ?? false;
              const validacionJobDesconocido = !tieneJobE01;

              // Determinar si cruza medianoche usando hora local (TZ Honduras)
              const entradaHM = formatTimeCorrectly(registro.horaEntrada); // HH:mm local
              const salidaHM = formatTimeCorrectly(registro.horaSalida); // HH:mm local
              const [eh, em] = entradaHM.split(":").map(Number);
              const [sh, sm] = salidaHM.split(":").map(Number);
              const entradaMin = eh * 60 + em;
              const salidaMin = sh * 60 + sm;
              const esTurnoNocturno = salidaMin < entradaMin;

              const isPlaceholder = !registro.id;

              // Ordenar actividades: extras antes de entrada, luego dentro del turno, luego extras después de salida.
              const toMinutes = (d?: string) => {
                if (!d) return Number.POSITIVE_INFINITY;
                const hm = formatTimeCorrectly(d);
                const [h, m] = hm.split(":").map(Number);
                if (!Number.isFinite(h) || !Number.isFinite(m))
                  return Number.POSITIVE_INFINITY;
                return h * 60 + m;
              };
              const entradaMinLocal = toMinutes(registro.horaEntrada);
              const salidaMinLocal = toMinutes(registro.horaSalida);
              const entradaLin = entradaMinLocal;
              const salidaLin =
                salidaMinLocal < entradaMinLocal
                  ? salidaMinLocal + 1440
                  : salidaMinLocal;
              const linearize = (min: number) =>
                esTurnoNocturno && min < entradaMinLocal ? min + 1440 : min;
              const activities = (registro.actividades ?? []).slice();
              const extraBefore: ActividadData[] & any[] = [];
              const middle: ActividadData[] & any[] = [];
              const extraAfter: ActividadData[] & any[] = [];
              for (const act of activities) {
                const startMin = toMinutes(act.horaInicio);
                const startLin = Number.isFinite(startMin)
                  ? linearize(startMin)
                  : Number.POSITIVE_INFINITY;
                const item = { act, startLin } as any;
                if (act.esExtra === true && startLin < entradaLin) {
                  extraBefore.push(item);
                } else if (act.esExtra === true && startLin >= salidaLin) {
                  extraAfter.push(item);
                } else {
                  middle.push(item);
                }
              }
              const cmpAsc = (a: any, b: any) =>
                (a.startMin ?? a.startLin) - (b.startMin ?? b.startLin);
              extraBefore.sort(cmpAsc);
              middle.sort(cmpAsc);
              extraAfter.sort(cmpAsc);
              // Solo rellenar tiempo Libre ANTES de entrada y DESPUES de salida
              const toEndLin = (act: any): number => {
                if (!act?.horaFin) return Number.POSITIVE_INFINITY;
                return linearize(toMinutes(act.horaFin));
              };
              const extraBeforeWithGaps: any[] = [...extraBefore];
              if (extraBeforeWithGaps.length > 0) {
                const last =
                  extraBeforeWithGaps[extraBeforeWithGaps.length - 1];
                const lastEnd = toEndLin(last.act);
                if (lastEnd < entradaLin) {
                  extraBeforeWithGaps.push({
                    act: {
                      id: `gap-${lastEnd}-${entradaLin}-${registro.id}`,
                      descripcion: "Libre",
                      duracionHoras:
                        Math.round(((entradaLin - lastEnd) / 60) * 100) / 100,
                      _synthetic: "Libre",
                      esExtra: true,
                    },
                    startLin: lastEnd,
                  });
                }
              }
              const extraAfterWithGaps: any[] = [...extraAfter];
              if (extraAfterWithGaps.length > 0) {
                const first = extraAfterWithGaps[0];
                if (salidaLin < first.startLin) {
                  extraAfterWithGaps.unshift({
                    act: {
                      id: `gap-${salidaLin}-${first.startLin}-${registro.id}`,
                      descripcion: "Libre",
                      duracionHoras:
                        Math.round(((first.startLin - salidaLin) / 60) * 100) /
                        100,
                      _synthetic: "Libre",
                      esExtra: true,
                    },
                    startLin: salidaLin,
                  });
                }
              }
              // Construir lista final según exista o no bloque normal
              let actividadesOrdenadas: ActividadData[];
              if (horasNormalesEsperadas === 0) {
                // Día sin horas normales (entrada = salida):
                // mostrar TODAS las actividades (incluyendo normales si existen, para que se vean en la validación)
                // y los intervalos LIBRE entre extras a lo largo del día
                const toEndLin = (act: any): number => {
                  if (!act?.horaFin) return Number.POSITIVE_INFINITY;
                  return linearize(toMinutes(act.horaFin));
                };
                const extrasAll: any[] = [...extraBefore, ...extraAfter]
                  .slice()
                  .sort((a, b) => a.startLin - b.startLin);
                const withGaps: any[] = [];
                for (let i = 0; i < extrasAll.length; i++) {
                  const curr = extrasAll[i];
                  if (i > 0) {
                    const prev = extrasAll[i - 1];
                    const prevEnd = toEndLin(prev.act);
                    const gapStart = prevEnd;
                    const gapEnd = curr.startLin;
                    if (gapEnd - gapStart > 1) {
                      withGaps.push({
                        act: {
                          id: `gap-${gapStart}-${gapEnd}-${registro.id}`,
                          descripcion: "Libre",
                          duracionHoras:
                            Math.round(((gapEnd - gapStart) / 60) * 100) / 100,
                          _synthetic: "Libre",
                          esExtra: true,
                        },
                        startLin: gapStart,
                      });
                    }
                  }
                  withGaps.push(curr);
                }
                // Incluir también las actividades normales (middle) para que se vean aunque no deberían existir
                actividadesOrdenadas = [...withGaps, ...middle].map(
                  (x) => x.act
                );
              } else {
                actividadesOrdenadas = [
                  ...extraBeforeWithGaps,
                  ...middle,
                  ...extraAfterWithGaps,
                ].map((x) => x.act);
              }

              return (
                <Grow
                  key={registro.id!}
                  in={!loading}
                  timeout={300 + idx * 100}
                >
                  <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                    {/* Encabezado del día */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={{ xs: 1, md: 4 }}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle1">
                        {registro.fecha
                          ? formatDateInSpanish(registro.fecha)
                          : "Fecha no disponible"}
                      </Typography>
                      {!registro.esDiaLibre && (
                        <>
                          <Typography variant="body2">
                            Entrada: {formatTimeCorrectly(registro.horaEntrada)}
                          </Typography>
                          <Typography variant="body2">
                            Salida: {formatTimeCorrectly(registro.horaSalida)}
                          </Typography>
                        </>
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        {registro.esDiaLibre && (
                          <Chip label="Día libre" color="info" size="small" />
                        )}
                        {!registro.esDiaLibre &&
                          horariosByFecha[registro.fecha ?? ""] !== "H2_1" &&
                          registro.esHoraCorrida && (
                            <Chip
                              label="Hora Corrida"
                              color="warning"
                              size="small"
                            />
                          )}
                        {registro.esIncapacidad && (
                          <Chip
                            label="Incapacidad"
                            color="error"
                            size="small"
                          />
                        )}
                        {!registro.esDiaLibre &&
                          (esTurnoNocturno || registro.jornada === "N") && (
                            <Chip
                              icon={<DarkModeIcon />}
                              label="Noche"
                              color="primary"
                              size="small"
                            />
                          )}
                      </Stack>
                      {registro.aprobacionRrhh === true && (
                        <Chip
                          label="Procesado"
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {registro.aprobacionRrhh === false && (
                        <Chip
                          label="Rechazado por RRHH"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {registro.comentarioEmpleado && (
                      <Typography
                        variant="body2"
                        color="black"
                        sx={{ mb: 2, fontWeight: "bold" }}
                      >
                        {registro.comentarioEmpleado}
                      </Typography>
                    )}

                    {/* Actividades */}
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Actividades
                    </Typography>

                    {/* Desktop: tabla / Mobile: tarjetas en columna */}
                    {isPlaceholder ? (
                      <Alert severity="error">
                        No se ha guardado un registro para este día
                      </Alert>
                    ) : !isMobile ? (
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
                              <TableCell align="right">Acción</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {registro.actividades &&
                            registro.actividades.length > 0 ? (
                              actividadesOrdenadas.map((act: any) => {
                                if (act?._synthetic) {
                                  return (
                                    <TableRow key={act.id ?? act.jobId}>
                                      <TableCell colSpan={8} align="center">
                                        <Typography
                                          sx={{
                                            fontWeight: 600,
                                            color: "error.main",
                                          }}
                                        >
                                          {act.descripcion}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                                return (
                                  <TableRow key={act.id ?? act.jobId}>
                                    <TableCell>{act.descripcion}</TableCell>
                                    <TableCell>
                                      {(() => {
                                        const horas = getActividadHoras(act);
                                        return Number.isFinite(
                                          Number(horas)
                                        ) ? (
                                          <Chip
                                            label={`${horas}h`}
                                            size="small"
                                          />
                                        ) : (
                                          <Chip
                                            label={`-`}
                                            size="small"
                                            variant="outlined"
                                          />
                                        );
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      {act.horaInicio && act.horaFin
                                        ? `${formatTimeCorrectly(
                                            act.horaInicio
                                          )} - ${formatTimeCorrectly(
                                            act.horaFin
                                          )}`
                                        : "-"}
                                    </TableCell>
                                    <TableCell>
                                      {act.esCompensatorio === true &&
                                      act.esExtra === false ? (
                                        <Typography color="text.secondary">
                                          -
                                        </Typography>
                                      ) : (
                                        <Typography
                                          color={
                                            (act?.job?.codigo || "").startsWith(
                                              "E"
                                            )
                                              ? "error.main"
                                              : undefined
                                          }
                                        >
                                          {act.job?.nombre ?? "-"}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {act.esCompensatorio === true &&
                                      act.esExtra === false ? (
                                        <Typography color="text.secondary">
                                          -
                                        </Typography>
                                      ) : (
                                        <Typography
                                          color={
                                            (act?.job?.codigo || "").startsWith(
                                              "E"
                                            )
                                              ? "error.main"
                                              : undefined
                                          }
                                        >
                                          {act.job?.codigo ?? "-"}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={
                                          act.esCompensatorio === true
                                            ? act.esExtra === true
                                              ? "Pago Compensatoria"
                                              : "Toma Compensatoria"
                                            : act.esExtra === true
                                            ? "Extra"
                                            : "Normal"
                                        }
                                        size="small"
                                        color={
                                          act.esCompensatorio === true
                                            ? act.esExtra === true
                                              ? "success"
                                              : "warning"
                                            : act.esExtra === true
                                            ? "error"
                                            : "default"
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {act.className || "-"}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="Editar job">
                                        <span>
                                          <IconButton
                                            aria-label="Editar job"
                                            size="small"
                                            onClick={() =>
                                              openJobDialog(registro, act)
                                            }
                                            disabled={disabled}
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={8}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    No hay actividades registradas para este día
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Horas laborables:{" "}
                                    {Number.isFinite(
                                      expectedHoursByFecha[registro.fecha ?? ""]
                                    )
                                      ? expectedHoursByFecha[
                                          registro.fecha ?? ""
                                        ] ?? 0
                                      : 0}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Stack spacing={1.5}>
                        {registro.actividades &&
                        registro.actividades.length > 0 ? (
                          actividadesOrdenadas.map((act: any) => (
                            <Paper
                              key={act.id ?? act.jobId}
                              variant="outlined"
                              sx={{ p: 1.5 }}
                            >
                              <Stack spacing={1}>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Descripción
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                    color={
                                      act?._synthetic === "Libre"
                                        ? "error.main"
                                        : undefined
                                    }
                                  >
                                    {act.descripcion}
                                  </Typography>
                                </Box>

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Horario
                                  </Typography>
                                  <Typography variant="body2">
                                    {act.horaInicio && act.horaFin
                                      ? `${formatTimeCorrectly(
                                          act.horaInicio
                                        )} - ${formatTimeCorrectly(
                                          act.horaFin
                                        )}`
                                      : "-"}
                                  </Typography>
                                </Box>

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Horas
                                  </Typography>
                                  <Box>
                                    {(() => {
                                      const horas = getActividadHoras(act);
                                      return Number.isFinite(Number(horas)) ? (
                                        <Chip
                                          label={`${horas}h`}
                                          size="small"
                                        />
                                      ) : (
                                        <Chip
                                          label={`-`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      );
                                    })()}
                                  </Box>
                                </Box>

                                {!(
                                  act.esCompensatorio === true &&
                                  act.esExtra === false
                                ) && (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Job
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color={
                                        (act?.job?.codigo || "").startsWith("E")
                                          ? "error.main"
                                          : undefined
                                      }
                                    >
                                      {act.job?.nombre ?? "-"}
                                    </Typography>
                                  </Box>
                                )}

                                {!(
                                  act.esCompensatorio === true &&
                                  act.esExtra === false
                                ) && (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Código
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color={
                                        (act?.job?.codigo || "").startsWith("E")
                                          ? "error.main"
                                          : undefined
                                      }
                                    >
                                      {act.job?.codigo ?? "-"}
                                    </Typography>
                                  </Box>
                                )}

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Tipo
                                  </Typography>
                                  <Box>
                                    {act?._synthetic ? (
                                      <Chip
                                        label={act._synthetic}
                                        size="small"
                                        color={
                                          act._synthetic === "Libre"
                                            ? "error"
                                            : "warning"
                                        }
                                        variant="outlined"
                                      />
                                    ) : (
                                      <Chip
                                        label={
                                          act.esCompensatorio === true
                                            ? act.esExtra === true
                                              ? "Pago Compensatoria"
                                              : "Toma Compensatoria"
                                            : act.esExtra === true
                                            ? "Extra"
                                            : "Normal"
                                        }
                                        size="small"
                                        color={
                                          act.esCompensatorio === true
                                            ? act.esExtra === true
                                              ? "success"
                                              : "warning"
                                            : act.esExtra === true
                                            ? "error"
                                            : "default"
                                        }
                                      />
                                    )}
                                  </Box>
                                </Box>

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Clase
                                  </Typography>
                                  <Typography variant="body2">
                                    {act?._synthetic
                                      ? "-"
                                      : act.className || "-"}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          ))
                        ) : (
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              No hay actividades registradas para este día
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Horas laborables:{" "}
                              {Number.isFinite(
                                expectedHoursByFecha[registro.fecha ?? ""]
                              )
                                ? expectedHoursByFecha[registro.fecha ?? ""] ??
                                  0
                                : 0}
                            </Typography>
                          </Paper>
                        )}
                      </Stack>
                    )}

                    {/* Validaciones */}
                    {!isPlaceholder &&
                      (validacionHorasNormales === false ||
                        !validacionHorasExtra.valido ||
                        !validacionIncapacidad ||
                        !validacionJobDesconocido) && (
                        <Box sx={{ mt: 2, mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="error.main"
                            gutterBottom
                            sx={{ fontWeight: "bold" }}
                          >
                            ⚠️ Errores de validación encontrados
                          </Typography>

                          {!validacionIncapacidad && (
                            <Typography
                              variant="body2"
                              color="error.main"
                              sx={{ mb: 1 }}
                            >
                              🏥 No pueden haber horas laborables en día de
                              incapacidad:{" "}
                              {normales > 0 && `${normales}h normales`}
                              {normales > 0 && extras > 0 && " y "}
                              {extras > 0 && `${extras}h extras`}
                            </Typography>
                          )}

                          {!validacionHorasNormales &&
                            horasNormalesEsperadas > 0 && (
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

                          {!validacionHorasNormales &&
                            horasNormalesEsperadas === 0 &&
                            normales > 0 && (
                              <Typography
                                variant="body2"
                                color="error.main"
                                sx={{ mb: 1 }}
                              >
                                📊 No debería haber horas normales registradas
                                (horaEntrada = horaSalida)
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

                          {!validacionJobDesconocido && (
                            <Typography
                              variant="body2"
                              color="error.main"
                              sx={{ mb: 1 }}
                            >
                              ⚠️ Job desconocido seleccionado
                            </Typography>
                          )}
                        </Box>
                      )}

                    {/* Resumen de horas */}
                    {!isPlaceholder && (
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
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Normales:
                            </Typography>
                            <Chip
                              label={`${normales}h`}
                              size="small"
                              variant="outlined"
                              color={
                                validacionHorasNormales ? "default" : "error"
                              }
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              {`(esperadas: ${horasNormalesEsperadas.toFixed(2)}
                              h)`}
                            </Typography>
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
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

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
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
                    )}

                    {/* Acciones Aprobar/Rechazar */}
                    {!isPlaceholder && (
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        justifyContent="flex-end"
                      >
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleRechazar(registro.id!)}
                          disabled={disabled}
                          fullWidth={isMobile}
                        >
                          Rechazar
                        </Button>
                        <Button
                          variant="outlined"
                          color="success"
                          disabled={
                            disabled ||
                            !validacionHorasNormales ||
                            !validacionHorasExtra.valido ||
                            !validacionIncapacidad ||
                            !validacionJobDesconocido ||
                            registro.aprobacionSupervisor === true
                          }
                          onClick={() => handleAprobar(registro.id!)}
                          fullWidth={isMobile}
                        >
                          Aprobar
                        </Button>
                      </Stack>
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
        </Box>
        {/* Fin del contenedor con scroll */}

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

      {/* Diálogo de rechazo */}
      <Dialog
        open={rechazoDialogOpen}
        onClose={handleCloseRechazoDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rechazar registro</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Ingrese el motivo de rechazo del registro. Este comentario será
            visible para el empleado.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="Comentario"
            placeholder="Ingrese motivo de rechazo"
            value={comentarioRechazo}
            onChange={(e) => {
              setComentarioRechazo(e.target.value);
              if (errorComentario) setErrorComentario("");
            }}
            error={!!errorComentario}
            helperText={errorComentario}
            required
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
          <Button onClick={handleCloseRechazoDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarRechazo}
            color="error"
            variant="contained"
            disabled={!comentarioRechazo.trim()}
          >
            Rechazar registro
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de edición de actividad: fullScreen en móvil */}
      <Dialog
        open={jobDialogOpen}
        onClose={closeJobDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>Editar actividad</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Descripción / Comentario"
              value={editedDescripcion}
              onChange={(e) => setEditedDescripcion(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="Ingresa una descripción para esta actividad"
            />

            <Autocomplete
              options={jobs}
              loading={loadingJobs}
              value={selectedJob}
              onChange={(_e, v) => setSelectedJob(v)}
              isOptionEqualToValue={(o, v) => !!v && o.id === v.id}
              getOptionLabel={(o) => `${o.codigo} - ${o.nombre}`}
              groupBy={(option) =>
                option.especial
                  ? "Jobs Especiales"
                  : option.empresa?.nombre ?? "Sin empresa"
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nuevo Job"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingJobs ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ pl: option.indentLevel * 4 }}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={option.especial ? "error.main" : undefined}
                    >
                      {option.codigo} - {option.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.descripcion || "Sin descripción"}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderGroup={(params) => (
                <Box key={params.key}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color:
                        params.group === "Jobs Especiales"
                          ? "error.main"
                          : "primary.main",
                      backgroundColor: "background.paper",
                      px: 2,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {params.group}
                  </Typography>
                  <Box component="li" sx={{ p: 0 }}>
                    <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                  </Box>
                </Box>
              )}
              noOptionsText={
                loadingJobs
                  ? "Cargando jobs..."
                  : "No hay jobs activos disponibles"
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeJobDialog}>Cancelar</Button>
          <Button
            onClick={saveJobChange}
            variant="contained"
            disabled={!selectedJob || loading}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default PlanillaDetallePreviewSupervisor;
