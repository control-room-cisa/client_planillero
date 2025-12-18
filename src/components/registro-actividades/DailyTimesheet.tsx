import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Fab,
  useTheme,
  useMediaQuery,
  Drawer,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Stack,
  Chip,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  Add,
  AccessTime,
  Close,
  Settings,
  Edit,
  Delete,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import RegistroDiarioService from "../../services/registroDiarioService";
import JobService from "../../services/jobService";
import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import { HorarioValidator } from "../../utils/horarioValidations";
import useHorarioRules from "../../hooks/useHorarioRules";
import { HorarioRulesFactory } from "../../utils/horarioRules";
import type { Job } from "../../services/jobService";
import type { RegistroDiarioData } from "../../dtos/RegistrosDiariosDataDto";
// import type { HorarioTrabajoDto } from "../../dtos/calculoHorasTrabajoDto";
import type { Activity, ActivityData } from "./types";

const TZ = "America/Tegucigalpa"; // UTC-6 fijo
const ymdInTZ = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// === Helpers de hora ===
// Formatear hora en zona local para mostrar lo que eligió el empleado
const formatTimeLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

const TZ_OFFSET = "-06:00"; // Honduras fijo

const buildISO = (baseDate: Date, hhmmStr: string, addDays = 0) => {
  // fecha base en TZ local (ya tienes ymdInTZ con America/Tegucigalpa)
  const ymd = ymdInTZ(baseDate); // "YYYY-MM-DD" en TZ local
  // Permitir 24:00 como fin de día (siguiente día a las 00:00)
  let effectiveHHMM = hhmmStr;
  let effectiveAddDays = addDays;
  if (hhmmStr === "24:00") {
    effectiveHHMM = "00:00";
    effectiveAddDays += 1;
  }
  // construye un ISO con offset local; toISOString() lo convierte a UTC
  const d = new Date(`${ymd}T${effectiveHHMM}:00${TZ_OFFSET}`);
  if (effectiveAddDays > 0) d.setDate(d.getDate() + effectiveAddDays);
  return d.toISOString();
};

type JobConJerarquia = Job & {
  indentLevel: number;
  parentCodigo?: string | null;
};

const DailyTimesheet: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const { fecha } = useParams<{ fecha?: string }>();
  const navigate = useNavigate();

  // Inicializar currentDate desde la URL o usar la fecha actual
  const [currentDate, setCurrentDate] = React.useState(() => {
    if (fecha) {
      // La fecha en la URL está en formato YYYY-MM-DD
      const [year, month, day] = fecha.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  });
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<Activity | null>(
    null
  );
  const [editingIndex, setEditingIndex] = React.useState<number>(-1);
  const [formData, setFormData] = React.useState<ActivityData>({
    descripcion: "",
    horaInicio: "",
    horaFin: "",
    horasInvertidas: "",
    job: "",
    class: "",
    horaExtra: false,
  });
  const [formErrors, setFormErrors] = React.useState<{ [key: string]: string }>(
    {}
  );

  // Jobs
  const [jobs, setJobs] = React.useState<JobConJerarquia[]>([]);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [selectedJob, setSelectedJob] = React.useState<JobConJerarquia | null>(
    null
  );

  // Registro diario
  const [registroDiario, setRegistroDiario] =
    React.useState<RegistroDiarioData | null>(null);
  const [dayConfigData, setDayConfigData] = React.useState({
    horaEntrada: "",
    horaSalida: "",
    jornada: "D", // Por defecto Día
    esDiaLibre: false,
    esIncapacidad: false,
    esHoraCorrida: false,
    comentarioEmpleado: "",
  });
  const [dayConfigErrors, setDayConfigErrors] = React.useState<{
    [key: string]: string;
  }>({});
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Nuevo estado para validaciones de horario
  const [horarioValidado, setHorarioValidado] = React.useState<{
    horaInicio: string;
    horaFin: string;
    esDiaLibre: boolean;
    esFestivo: boolean;
    nombreDiaFestivo: string;
    horasNormales: number;
    mostrarJornada: boolean;
    mostrarNombreFestivo: boolean;
    tipoHorario: string; // Agregar tipo de horario
  } | null>(null);

  // Estado para guardar los datos del horario completo (para acceder a cantidadHorasLaborables)
  const [horarioData, setHorarioData] = React.useState<{
    cantidadHorasLaborables: number;
    esFestivo: boolean;
    cantidadHorasLaborablesNormales: number; // Horas que se habrían trabajado si no fuera feriado
  } | null>(null);

  // Reglas de UI ahora controlan visibilidad/habilitación por tipo de horario
  const horarioRules = useHorarioRules({
    tipoHorario: horarioValidado?.tipoHorario || undefined,
    formData: dayConfigData,
    apiData: horarioValidado,
  });

  // === NUEVO: bandera de horario H2 ===
  const isH2 = horarioValidado?.tipoHorario === "H2";
  // Helper para verificar si es H1, H1_1 o H1_2
  const isH1 = ["H1", "H1_1", "H1_2"].includes(
    horarioValidado?.tipoHorario || ""
  );
  const isHoliday = Boolean(
    horarioData?.esFestivo || horarioValidado?.esFestivo
  );

  // ===== Helpers de tiempo =====
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToHHMM = (minutes: number): string => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Función para validar formato de hora (incluyendo 24:00)
  const isValidTimeFormat = (time: string): boolean => {
    if (!time) return false;
    const timeRegex = /^([01]?\d|2[0-4]):([0-5]\d)$/;
    if (!timeRegex.test(time)) return false;

    const [h, m] = time.split(":").map(Number);
    // Permitir 24:00 pero no 24:01, 24:15, etc.
    if (h === 24 && m !== 0) return false;
    return true;
  };

  // Función para incrementar/decrementar tiempo con teclas direccionales
  const adjustTime = (
    timeStr: string,
    direction: "up" | "down",
    isHour: boolean
  ): string => {
    if (!timeStr) return timeStr;

    let [h, m] = timeStr.split(":").map(Number);

    if (isHour) {
      // Ajustar horas
      if (direction === "up") {
        if (timeStr === "24:00") {
          // Desde 24:00 ir a 01:00
          h = 1;
          m = 0;
        } else if (h >= 23) {
          // Desde 23:xx ir a 00:xx (no permitir más de 24:00 con horas)
          h = 0;
        } else {
          h = h + 1;
        }
      } else {
        if (timeStr === "24:00") {
          // Desde 24:00 ir a 23:00
          h = 23;
          m = 0;
        } else if (h <= 0) {
          // Desde 00:xx ir a 23:xx
          h = 23;
        } else {
          h = h - 1;
        }
      }
    } else {
      // Ajustar minutos en intervalos de 15
      if (direction === "up") {
        if (timeStr === "23:45") {
          // Caso especial: desde 23:45 ir a 24:00 (solo para fin de día)
          h = 24;
          m = 0;
        } else if (timeStr === "24:00") {
          // Desde 24:00 ir a 00:15
          h = 0;
          m = 15;
        } else {
          m += 15;
          if (m >= 60) {
            m = 0;
            h = h >= 23 ? 0 : h + 1;
          }
        }
      } else {
        if (timeStr === "24:00") {
          // Desde 24:00 ir a 23:45
          h = 23;
          m = 45;
        } else if (timeStr === "00:00") {
          // Desde 00:00 ir a 23:45
          h = 23;
          m = 45;
        } else {
          m -= 15;
          if (m < 0) {
            m = 45;
            h = h <= 0 ? 23 : h - 1;
          }
        }
      }
    }

    // Formatear resultado
    const result = `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}`;

    return result;
  };

  // Función para redondear tiempo a intervalos de 15 minutos
  const roundToQuarterHour = (time: string): string => {
    if (!time) return time;

    // Manejar 24:00 especialmente
    if (time === "24:00") return time;

    const [h, m] = time.split(":").map(Number);
    const totalMinutes = h * 60 + m;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;

    // Si el redondeo lleva a 24:00 (1440 minutos), mantenerlo
    if (roundedMinutes >= 1440) return "24:00";

    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const intervalOverlap = (a1: number, a2: number, b1: number, b2: number) =>
    Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

  const getH2Schedule = React.useCallback(
    (jornadaValue?: string | null, targetDate?: Date) => {
      if (jornadaValue === "D") {
        return { horaEntrada: "07:00", horaSalida: "19:00" };
      }
      if (jornadaValue === "N") {
        const referenceDate = targetDate ?? currentDate;
        const day = referenceDate.getDay(); // 0 = domingo, 2 = martes
        if (day === 2) {
          return { horaEntrada: "00:00", horaSalida: "07:00" };
        }
        return { horaEntrada: "19:00", horaSalida: "07:00" };
      }
      return null;
    },
    [currentDate]
  );

  const getDefaultHorario = React.useCallback(
    (jornadaValue?: string | null) => {
      if (horarioValidado?.tipoHorario === "H2") {
        return (
          getH2Schedule(
            jornadaValue && jornadaValue !== "" ? jornadaValue : "D",
            currentDate
          ) || { horaEntrada: "07:00", horaSalida: "19:00" }
        );
      }
      return {
        horaEntrada: horarioValidado?.horaInicio || "07:00",
        horaSalida: horarioValidado?.horaFin || "17:00",
      };
    },
    [
      currentDate,
      getH2Schedule,
      horarioValidado?.horaFin,
      horarioValidado?.horaInicio,
      horarioValidado?.tipoHorario,
    ]
  );

  // ===== Helpers de validación/cálculo =====

  // Devuelve error si la hora dada está fuera del rango del día (texto fijo pedido)
  // Nota: Los inputs de hora solo se muestran para Hora Extra, por lo que
  // esta validación no aplica y se omite para evitar mensajes contradictorios.
  const errorOutsideRange = (): string => "";

  // Valida Hora fin: primero rango; luego relación con inicio
  const computeHoraFinError = (fin: string, inicio: string): string => {
    const rangoErr = errorOutsideRange();
    if (rangoErr) return rangoErr;
    if (!fin || !inicio) return "";

    const s = timeToMinutes(inicio);
    let e = timeToMinutes(fin);

    // Permitir 24:00 como fin válido (representa siguiente día 00:00)
    if (fin === "24:00") {
      e = 1440; // 24:00 = 1440 minutos
    }

    // Validación estricta: fin debe ser mayor que inicio,
    // EXCEPTO si fin es exactamente 00:00 (que representa 24:00)
    if (e <= s) {
      if (fin === "00:00" && s > 0) {
        // 00:00 como fin es válido solo si inicio > 00:00 (cruza medianoche)
        return "";
      } else {
        return "La hora final debe ser posterior a la inicial";
      }
    }

    return "";
  };

  // Calcula HH con o sin descuento de almuerzo (12:00–13:00) según reglas del horario
  // Para horas extra, NUNCA se descuenta almuerzo
  const computeHorasInvertidas = (
    inicioHHMM: string,
    finHHMM: string,
    isExtraHour = false
  ): string => {
    if (!inicioHHMM || !finHHMM) return "";

    // Duración base - manejar 24:00 como fin de día
    const [h1, m1] = inicioHHMM.split(":").map(Number);
    let h2, m2;
    if (finHHMM === "24:00") {
      h2 = 24;
      m2 = 0;
    } else {
      [h2, m2] = finHHMM.split(":").map(Number);
    }

    let dur = h2 + m2 / 60 - (h1 + m1 / 60);
    if (dur < 0) dur += 24; // cruza medianoche

    // Para horas extra, NO descontar almuerzo bajo ninguna circunstancia
    if (isExtraHour) {
      return dur.toFixed(2);
    }

    // Determinar hora de almuerzo usando reglas del horario
    const horaAlmuerzo = horarioRules.utils.calculateLunchHours();

    // Solo descontar almuerzo si horaAlmuerzo > 0 (no es hora corrida) Y si hay solapamiento real
    if (horaAlmuerzo > 0) {
      const inicioMin = timeToMinutes(inicioHHMM);
      let finMin = finHHMM === "24:00" ? 1440 : timeToMinutes(finHHMM);

      // Manejar cruce de medianoche
      if (finMin <= inicioMin) {
        finMin += 1440;
      }

      const L1 = 720; // 12:00
      const L2 = 780; // 13:00

      // Verificar si hay solapamiento real entre la actividad y el período de almuerzo
      const overlapMin = intervalOverlap(inicioMin, finMin, L1, L2);

      // Solo descontar si hay solapamiento real
      if (overlapMin > 0) {
        dur = Math.max(0, dur - overlapMin / 60);
      }
    }

    return dur.toFixed(2);
  };

  // === NUEVO: helpers para mostrar/sumar horas por actividad (chips & progreso) ===
  const formatHours = (h: number) =>
    String(Math.round(h * 100) / 100).replace(/\.0+$/, "");

  const computeHorasActividadForDisplayNum = (act: Activity): number => {
    // Si no hay horas de inicio/fin (actividad normal), usar duracionHoras
    if (!act.horaInicio || !act.horaFin)
      return Math.max(0, Number(act.duracionHoras || 0));

    const sHM = formatTimeLocal(act.horaInicio);
    const eHM = formatTimeLocal(act.horaFin);

    const inicioMin = timeToMinutes(sHM);
    let finMin = eHM === "24:00" ? 1440 : timeToMinutes(eHM);

    // Manejar cruce de medianoche
    if (finMin <= inicioMin) {
      finMin += 1440;
    }

    // Duración base
    let hours = (finMin - inicioMin) / 60;

    // Para horas extra, NO descontar almuerzo bajo ninguna circunstancia
    if (act.esExtra) {
      return Math.round(hours * 100) / 100;
    }

    // Determinar hora de almuerzo usando reglas del horario
    const horaAlmuerzo = horarioRules.utils.calculateLunchHours();

    // Solo descontar almuerzo si horaAlmuerzo > 0 (no es hora corrida) Y si hay solapamiento real
    if (horaAlmuerzo > 0) {
      const L1 = 720; // 12:00
      const L2 = 780; // 13:00

      // Verificar si hay solapamiento real entre la actividad y el período de almuerzo
      const overlapMin = intervalOverlap(inicioMin, finMin, L1, L2);

      // Solo descontar si hay solapamiento real
      if (overlapMin > 0) {
        hours = Math.max(0, hours - overlapMin / 60);
      }
    }

    return Math.round(hours * 100) / 100;
  };

  const computeHorasActividadForDisplay = (act: Activity): string =>
    formatHours(computeHorasActividadForDisplayNum(act));

  // === NUEVO: helpers para validar actividades vs. nuevo rango del día ===
  const buildIntervals = (
    start: number,
    end: number
  ): Array<[number, number]> => {
    if (end >= start) return [[start, end]];
    return [
      [0, end],
      [start, 24 * 60],
    ];
  };

  const getBoundsFromHHMM = (entrada: string, salida: string) => {
    const start = timeToMinutes(entrada);
    let end = timeToMinutes(salida);
    const crossesMidnight = end <= start;
    const intervals = buildIntervals(start, end);
    if (crossesMidnight) end += 1440;
    return { dayStart: start, dayEnd: end, crossesMidnight, intervals };
  };

  const splitActivityIntervals = (
    startMin: number,
    endMin: number
  ): Array<[number, number]> => {
    if (endMin >= startMin) return [[startMin, endMin]];
    return [
      [startMin, 24 * 60],
      [0, endMin],
    ];
  };

  const isActivityOutsideRange = (
    act: Activity,
    intervals: Array<[number, number]>
  ) => {
    if (!act.horaInicio || !act.horaFin) return false;
    const sHM = formatTimeLocal(act.horaInicio);
    const eHM = formatTimeLocal(act.horaFin);

    const activityIntervals = splitActivityIntervals(
      timeToMinutes(sHM),
      eHM === "24:00" ? 24 * 60 : timeToMinutes(eHM)
    );

    const isSegmentInside = (segStart: number, segEnd: number) =>
      intervals.some(
        ([intStart, intEnd]) => segStart >= intStart && segEnd <= intEnd
      );

    return activityIntervals.some(
      ([segStart, segEnd]) => !isSegmentInside(segStart, segEnd)
    );
  };

  // Usar ref para evitar bucle infinito en el efecto de redirección
  const hasRedirected = React.useRef(false);

  // ===== Sincronizar fecha con URL cuando cambie el parámetro =====
  React.useEffect(() => {
    if (fecha) {
      const [year, month, day] = fecha.split("-").map(Number);
      const dateFromUrl = new Date(year, month - 1, day);
      const currentDateStr = ymdInTZ(currentDate);
      const urlDateStr = ymdInTZ(dateFromUrl);

      // Solo actualizar si la fecha de la URL es diferente a la actual
      if (currentDateStr !== urlDateStr) {
        setCurrentDate(dateFromUrl);
        setInitialLoading(true);
      }
      hasRedirected.current = false; // Resetear flag cuando hay fecha
    } else if (!hasRedirected.current) {
      // Si no hay fecha en la URL y no hemos redirigido aún, navegar a la fecha actual
      hasRedirected.current = true;
      const today = new Date();
      const fechaString = ymdInTZ(today);
      navigate(`/registro-actividades/${fechaString}`, { replace: true });
    }
  }, [fecha]);

  // ===== Carga inicial =====
  React.useEffect(() => {
    loadRegistroDiario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // Cargar jobs cuando se abra el drawer
  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const jobsData = await JobService.getAll();
      const jobsActivos = jobsData.filter((j) => j.activo === true);

      // Filtrar jobs especiales: solo mostrar cuando Hora Extra NO está marcado
      const jobsFiltrados = formData.horaExtra
        ? jobsActivos.filter((j) => !j.especial) // Solo jobs normales para hora extra
        : jobsActivos; // Todos los jobs (incluidos especiales) para horas normales

      const jobMap = new Map(jobsFiltrados.map((j) => [j.codigo, j]));

      const jobsConJerarquia: JobConJerarquia[] = jobsFiltrados.map((j) => {
        const isSubJob = j.codigo.includes(".");
        const padreCodigo = isSubJob ? j.codigo.split(".")[0] : null;
        const parentJob = padreCodigo ? jobMap.get(padreCodigo) : null;
        return {
          ...j,
          indentLevel: isSubJob ? 1 : 0,
          parentCodigo: parentJob?.codigo || null,
        };
      });

      setJobs(jobsConJerarquia);
    } catch (e) {
      console.error("Error al cargar jobs:", e);
      setSnackbar({
        open: true,
        message: "Error al cargar la lista de jobs",
        severity: "error",
      });
    } finally {
      setLoadingJobs(false);
    }
  };

  const readOnly = !!(
    registroDiario?.aprobacionSupervisor || registroDiario?.aprobacionRrhh
  );

  const loadRegistroDiario = async () => {
    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);

      // Limpiar el estado del formulario antes de cargar nuevos datos
      // Esto asegura que no se mantengan valores del día anterior
      setDayConfigData({
        horaEntrada: "",
        horaSalida: "",
        jornada: "D",
        esDiaLibre: false,
        esIncapacidad: false,
        esHoraCorrida: false,
        comentarioEmpleado: "",
      });
      setRegistroDiario(null);

      // Delay mínimo de 500ms para evitar parpadeo
      const [registro] = await Promise.all([
        RegistroDiarioService.getByDate(dateString),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);

      setRegistroDiario(registro);

      // Cargar validaciones de horario desde la API primero para obtener los valores correctos
      await loadHorarioValidations(dateString, registro);
    } catch (e) {
      console.error("Error al cargar registro diario:", e);
      setSnackbar({
        open: true,
        message: "Error al cargar los datos del día",
        severity: "error",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Nueva función para cargar validaciones de horario
  const loadHorarioValidations = async (
    fecha: string,
    registro: RegistroDiarioData | null
  ) => {
    try {
      if (!user?.id) return;

      // Obtener horario desde la API de cálculo usando getHorarioTrabajo
      // NOTA: Cuando es día feriado, el backend automáticamente calcula y guarda
      // las horas laborables (cantidadHorasLaborables) en el campo horasFeriado
      // del registro diario. Esto se hace en RegistroDiarioService.upsertRegistro
      const horarioData = await CalculoHorasTrabajoService.getHorarioTrabajo(
        user.id,
        fecha
      );

      console.log("[DEBUG] horarioData desde API:", horarioData);
      console.log("[DEBUG] horarioData.esDiaLibre:", horarioData.esDiaLibre);

      // Determinar si hay datos existentes de la API
      const datosExistentes = Boolean(registro);

      // Validar según el tipo de horario
      const validacion = HorarioValidator.validateByTipo(
        horarioData.tipoHorario,
        horarioData,
        datosExistentes
      );

      // Calcular horas laborables normales (antes de aplicar feriado)
      // Si es feriado, calcular las horas que se habrían trabajado según el día de la semana
      let cantidadHorasLaborablesNormales = horarioData.cantidadHorasLaborables;
      if (horarioData.esFestivo) {
        const fechaObj = new Date(`${fecha}T00:00:00`);
        const diaSemana = fechaObj.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

        // Calcular horas normales según día de la semana (lógica H1)
        // Viernes = 8h, otros días laborables = 9h, sábado/domingo = 0h
        if (diaSemana === 5) {
          // Viernes
          cantidadHorasLaborablesNormales = 8;
        } else if (diaSemana === 0 || diaSemana === 6) {
          // Domingo o Sábado
          cantidadHorasLaborablesNormales = 0;
        } else {
          // Lunes a Jueves
          cantidadHorasLaborablesNormales = 9;
        }
      }

      // Guardar datos del horario para acceso directo
      setHorarioData({
        cantidadHorasLaborables: horarioData.cantidadHorasLaborables,
        esFestivo: horarioData.esFestivo,
        cantidadHorasLaborablesNormales,
      });

      // Crear el objeto de validación con las horas normales de la API
      const validacionCompleta = {
        ...validacion,
        // Usar cantidadHorasLaborables directamente de la API
        horasNormales: horarioData.cantidadHorasLaborables,
        // Agregar el tipo de horario
        tipoHorario: horarioData.tipoHorario,
      };

      setHorarioValidado(validacionCompleta);

      // Aplicar configuración automática desde la API usando reglas
      if (validacion) {
        setDayConfigData((prev) => {
          const base = HorarioRulesFactory.processApiDefaults(
            horarioData.tipoHorario,
            prev,
            horarioData,
            datosExistentes
          );

          console.log("[DEBUG] base from processApiDefaults:", base);
          console.log("[DEBUG] prev esDiaLibre:", prev.esDiaLibre);
          console.log("[DEBUG] base esDiaLibre:", base.esDiaLibre);

          // Para H1, H1_1, H1_2: siempre usar horas del horario de la API (no editables)
          // Para H2: conservar horas del registro guardado (editables)
          if (datosExistentes && registro) {
            if (["H1", "H1_1", "H1_2"].includes(horarioData.tipoHorario)) {
              // H1, H1_1, H1_2: usar horas de la API, ignorar las del registro
              // PERO conservar esDiaLibre si viene del horario de la API
              return {
                ...base,
                esDiaLibre: Boolean(horarioData.esDiaLibre),
                esIncapacidad: registro.esIncapacidad || false,
                // Asegurar que comentarioEmpleado use el valor del registro o esté vacío
                comentarioEmpleado: registro.comentarioEmpleado || "",
              };
            } else {
              // H2 u otros: conservar horas del registro guardado
              return {
                ...base,
                // Mostrar horas en TZ local
                horaEntrada: formatTimeLocal(registro.horaEntrada),
                horaSalida: formatTimeLocal(registro.horaSalida),
                esDiaLibre: Boolean(horarioData.esDiaLibre),
                esIncapacidad: registro.esIncapacidad || false,
                // Asegurar que comentarioEmpleado use el valor del registro o esté vacío
                comentarioEmpleado: registro.comentarioEmpleado || "",
              };
            }
          }

          // Si no hay registro existente, aplicar el esDiaLibre desde el horario de la API
          // Asegurar que comentarioEmpleado esté vacío si no hay registro
          const result = {
            ...base,
            esDiaLibre: Boolean(horarioData.esDiaLibre),
            esIncapacidad: registro?.esIncapacidad || false,
            comentarioEmpleado: registro?.comentarioEmpleado || "",
          };

          console.log("[DEBUG] Final result esDiaLibre:", result.esDiaLibre);
          console.log("[DEBUG] Final result:", result);

          return result;
        });
      }
    } catch (error) {
      console.error("Error al cargar validaciones de horario:", error);
      // No mostrar error al usuario, usar valores por defecto
    }
  };

  // ===== Drawer =====
  const handleDrawerOpen = async () => {
    setDrawerOpen(true);

    const sinHorasDisponibles =
      horasNormales === 0 || horasRestantesDia <= 0.01;

    if (sinHorasDisponibles) {
      setFormData((prev) => ({
        ...prev,
        horaExtra: true,
        horasInvertidas: "",
        horaInicio: "",
        horaFin: "",
        job: "",
      }));
      setSelectedJob(null);
    }

    await loadJobs();
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingActivity(null);
    setEditingIndex(-1);
    setSelectedJob(null);
    // Limpiar formulario al cerrar
    setFormData({
      descripcion: "",
      horaInicio: "",
      horaFin: "",
      horasInvertidas: "",
      job: "",
      class: "",
      horaExtra: false,
    });
    setFormErrors({});
  };

  const handleEditActivity = async (activity: Activity, index: number) => {
    setEditingActivity(activity);
    setEditingIndex(index);
    const inicio = activity.horaInicio
      ? formatTimeLocal(activity.horaInicio)
      : "";
    const fin = activity.horaFin ? formatTimeLocal(activity.horaFin) : "";
    setFormData({
      descripcion: activity.descripcion || "",
      horaInicio: inicio,
      horaFin: fin,
      // Cargar horas invertidas desde la API (duracionHoras)
      horasInvertidas: activity.duracionHoras?.toString() || "",
      job: activity.jobId?.toString() || "",
      class: activity.className || "",
      horaExtra: activity.esExtra || false,
    });
    setDrawerOpen(true);
    await loadJobs();
  };

  // Efecto para recargar jobs cuando cambie hora extra
  React.useEffect(() => {
    if (drawerOpen) {
      loadJobs();
    }
  }, [formData.horaExtra, drawerOpen]);

  // Efecto para establecer el job seleccionado cuando se cargan los jobs y hay una actividad en edición
  React.useEffect(() => {
    if (editingActivity && jobs.length > 0 && editingActivity.jobId) {
      const job = jobs.find((j) => j.id === editingActivity.jobId);
      if (job) setSelectedJob(job);
    }
  }, [jobs, editingActivity]);

  const handleDeleteActivity = async (index: number) => {
    if (!registroDiario?.actividades) return;

    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);

      const actividadesActualizadas = registroDiario.actividades
        .filter((_, i) => i !== index)
        .map((act) => ({
          jobId: act.jobId,
          duracionHoras: act.duracionHoras,
          esExtra: act.esExtra,
          className: act.className,
          descripcion: act.descripcion,
          horaInicio: act.horaInicio,
          horaFin: act.horaFin,
        }));

      const params = {
        fecha: dateString,
        horaEntrada: registroDiario.horaEntrada,
        horaSalida: registroDiario.horaSalida,
        jornada: registroDiario.jornada,
        esDiaLibre: registroDiario.esDiaLibre,
        esIncapacidad: registroDiario.esIncapacidad,
        // Si es H2, enviar esHoraCorrida=true al backend
        esHoraCorrida: isH2 ? true : registroDiario.esHoraCorrida,
        comentarioEmpleado: registroDiario.comentarioEmpleado,
        actividades: actividadesActualizadas,
      };

      const updatedRegistro = await RegistroDiarioService.upsert(params);
      setRegistroDiario(updatedRegistro);
      setSnackbar({
        open: true,
        message: "Actividad eliminada correctamente",
        severity: "success",
      });
    } catch (e) {
      console.error("Error al eliminar actividad:", e);
      setSnackbar({
        open: true,
        message: "Error al eliminar la actividad",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== Config del día =====
  // Manejador de teclas para campos de tiempo en configuración del día
  const handleDayConfigTimeKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const target = event.target as HTMLInputElement;
    const { name, value } = target;

    if (!["horaEntrada", "horaSalida"].includes(name)) return;

    let currentValue = value;
    // Si está vacío o inválido, empezar con 08:00
    if (!currentValue || !isValidTimeFormat(currentValue)) {
      currentValue = "08:00";
    }

    let newValue = currentValue;
    const cursorPos = target.selectionStart || 0;
    const isHourPart = cursorPos <= 2;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        newValue = adjustTime(currentValue, "up", isHourPart);
        break;

      case "ArrowDown":
        event.preventDefault();
        newValue = adjustTime(currentValue, "down", isHourPart);
        break;

      default:
        return;
    }

    if (newValue !== value) {
      setDayConfigData((prev) => ({ ...prev, [name]: newValue }));

      // Mantener posición del cursor
      setTimeout(() => {
        target.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    }
  };

  const handleDayConfigInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = event.target;

    let finalValue = type === "checkbox" ? checked : value;

    if (name === "esHoraCorrida" && horasCero) {
      return;
    }

    if ((isHoliday || dayConfigData.esDiaLibre || dayConfigData.esIncapacidad) && (name === "horaEntrada" || name === "horaSalida")) {
      return;
    }

    // Redondear tiempos a intervalos de 15 minutos
    if (
      type !== "checkbox" &&
      (name === "horaEntrada" || name === "horaSalida")
    ) {
      finalValue = roundToQuarterHour(value);
    }

    setDayConfigData((prev) => {
      let next = horarioRules.utils.onFieldChange(
        name as any,
        finalValue,
        prev
      );

      if (horarioValidado?.tipoHorario === "H2") {
        if (name === "esDiaLibre" || name === "esIncapacidad") {
          if (finalValue) {
            next = {
              ...next,
              jornada: "",
              horaEntrada: "07:00",
              horaSalida: "07:00",
            };
          } else {
            const schedule = getDefaultHorario(prev.jornada || "D");
            next = {
              ...next,
              jornada: prev.jornada || "D",
              horaEntrada: schedule.horaEntrada,
              horaSalida: schedule.horaSalida,
            };
          }
        } else if (
          name === "jornada" &&
          typeof finalValue === "string" &&
          finalValue &&
          !next.esDiaLibre &&
          !next.esIncapacidad
        ) {
          const schedule = getH2Schedule(finalValue, currentDate);
          if (schedule) {
            next = {
              ...next,
              horaEntrada: schedule.horaEntrada,
              horaSalida: schedule.horaSalida,
            };
          }
        }
      } else if (name === "esDiaLibre" || name === "esIncapacidad") {
        const defaults = getDefaultHorario(prev.jornada || "D");
        if (finalValue) {
          next = {
            ...next,
            jornada: "",
            horaEntrada: defaults.horaEntrada,
            horaSalida: defaults.horaEntrada,
          };
        } else {
          next = {
            ...next,
            jornada: prev.jornada || "D",
            horaEntrada: defaults.horaEntrada,
            horaSalida: defaults.horaSalida,
          };
        }
      }

      return next;
    });

    if (dayConfigErrors[name])
      setDayConfigErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateDayConfig = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!dayConfigData.horaEntrada)
      errors.horaEntrada = "La hora de entrada es obligatoria";
    if (!dayConfigData.horaSalida)
      errors.horaSalida = "La hora de salida es obligatoria";
    setDayConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const hasChangesInDayConfig = (): boolean => {
    if (!registroDiario) return false;

    // Extraer solo la hora de la fecha ISO sin conversión de zona horaria
    const registroHoraEntrada = formatTimeLocal(registroDiario.horaEntrada);
    const registroHoraSalida = formatTimeLocal(registroDiario.horaSalida);

    return (
      dayConfigData.horaEntrada !== registroHoraEntrada ||
      dayConfigData.horaSalida !== registroHoraSalida ||
      dayConfigData.jornada !== registroDiario.jornada ||
      dayConfigData.esDiaLibre !== registroDiario.esDiaLibre ||
      dayConfigData.esIncapacidad !== (registroDiario.esIncapacidad || false) ||
      dayConfigData.esHoraCorrida !== registroDiario.esHoraCorrida ||
      dayConfigData.comentarioEmpleado !==
        (registroDiario.comentarioEmpleado || "")
    );
  };

  const handleDayConfigSubmit = async () => {
    if (!validateDayConfig()) return;

    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);
      const horaEntradaISO = buildISO(
        currentDate,
        dayConfigData.horaEntrada,
        0
      );
      // decidir si horaSalida es al día siguiente
      const startM = timeToMinutes(dayConfigData.horaEntrada);
      const endM = timeToMinutes(dayConfigData.horaSalida);
      const addDayForEnd = endM <= startM ? 1 : 0;
      const horaSalidaISO = buildISO(
        currentDate,
        dayConfigData.horaSalida,
        addDayForEnd
      );

      // === NUEVO: Validación de actividades vs. NUEVO rango del día ===
      {
        const { intervals: newIntervals } = getBoundsFromHHMM(
          dayConfigData.horaEntrada,
          dayConfigData.horaSalida
        );

        const acts = registroDiario?.actividades || [];
        const outOfRange = acts
          .filter((act) => !act.esExtra)
          .map((act, idx) => ({
            idx,
            act,
            outside: isActivityOutsideRange(act, newIntervals),
          }))
          .filter((x) => x.outside);

        if (outOfRange.length > 0) {
          const rango = `${dayConfigData.horaEntrada} - ${dayConfigData.horaSalida}`;
          setSnackbar({
            open: true,
            severity: "error",
            message: `Hay ${outOfRange.length} actividad fuera del nuevo rango (${rango}). Debes actualizar actividad.`,
          });
          setLoading(false);
          return; // BLOQUEA el guardado del día
        }
      }

      // Usar siempre el valor actual de esDiaLibre del formulario (para cualquier tipo de horario)
      const esDiaLibreFinal = dayConfigData.esDiaLibre;
      const esIncapacidadFinal = dayConfigData.esIncapacidad;

      // Si es H2, enviar esHoraCorrida=true al backend
      const esHoraCorridaFinal = isH2
        ? true
        : horasCero
        ? false
        : dayConfigData.esHoraCorrida;

      // Calcular horas feriado si es día festivo
      const horasFeriado =
        horarioData?.esFestivo && horarioData.cantidadHorasLaborablesNormales
          ? horarioData.cantidadHorasLaborablesNormales
          : undefined;

      const params = {
        fecha: dateString,
        horaEntrada: horaEntradaISO,
        horaSalida: horaSalidaISO,
        jornada: dayConfigData.jornada,
        esDiaLibre: esDiaLibreFinal,
        esIncapacidad: esIncapacidadFinal,
        esHoraCorrida: esHoraCorridaFinal,
        comentarioEmpleado: dayConfigData.comentarioEmpleado,
        ...(horasFeriado !== undefined && { horasFeriado }),
        actividades:
          registroDiario?.actividades?.map((act) => ({
            jobId: act.jobId,
            duracionHoras: act.duracionHoras,
            esExtra: act.esExtra,
            className: act.className,
            descripcion: act.descripcion,
            horaInicio: act.horaInicio,
            horaFin: act.horaFin,
          })) || [],
      };

      const updatedRegistro = await RegistroDiarioService.upsert(params);
      setRegistroDiario(updatedRegistro);
      setSnackbar({
        open: true,
        message: "Configuración del día guardada correctamente",
        severity: "success",
      });
    } catch (e) {
      console.error("Error al guardar configuración del día:", e);
      setSnackbar({
        open: true,
        message: "Error al guardar la configuración",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== Form actividad =====
  // Manejador de teclas para campos de tiempo
  const handleTimeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const { name, value } = target;

    if (!["horaInicio", "horaFin"].includes(name)) return;

    let currentValue = value;
    // Si está vacío, empezar con 08:00
    if (!currentValue) {
      currentValue = "08:00";
    }

    let newValue = currentValue;
    const cursorPos = target.selectionStart || 0;
    const isHourPart = cursorPos <= 2;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        newValue = adjustTime(currentValue, "up", isHourPart);
        break;

      case "ArrowDown":
        event.preventDefault();
        newValue = adjustTime(currentValue, "down", isHourPart);
        break;

      default:
        return;
    }

    if (newValue !== value) {
      // Para horaFin, si el resultado es 24:00, mostrar 00:00 en el input
      let displayValue = newValue;
      if (name === "horaFin" && newValue === "24:00") {
        displayValue = "00:00";
      }

      // Simular evento de cambio para activar la lógica de conversión
      const syntheticEvent = {
        target: { name, value: displayValue, type: "time" },
      } as React.ChangeEvent<HTMLInputElement>;

      handleInputChange(syntheticEvent);

      // Mantener posición del cursor
      setTimeout(() => {
        target.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => {
      let finalValue = type === "checkbox" ? checked : value;

      // Redondear tiempos a intervalos de 15 minutos
      if (
        type !== "checkbox" &&
        (name === "horaInicio" || name === "horaFin")
      ) {
        finalValue = roundToQuarterHour(value);

        // Para horaFin, si el usuario selecciona 00:00, convertir a 24:00 internamente
        // para representar el final del día
        if (name === "horaFin" && value === "00:00") {
          // Solo convertir a 24:00 si la hora de inicio es posterior a 00:00
          const inicioMinutos = timeToMinutes(prev.horaInicio || "00:00");
          if (inicioMinutos > 0) {
            finalValue = "24:00";
          }
        }
      }

      const next = { ...prev, [name]: finalValue };

      // Manejar checkbox de hora extra
      if (name === "horaExtra") {
        if (checked) {
          // Al activar hora extra: calcular automáticamente las horas invertidas
          if (next.horaInicio && next.horaFin) {
            const v = computeHorasInvertidas(
              next.horaInicio,
              next.horaFin,
              true
            );
            next.horasInvertidas = v;
          }
          // Limpiar job si es especial al activar hora extra
          if (selectedJob?.especial) {
            setSelectedJob(null);
            next.job = "";
          }
        } else {
          // Al desactivar hora extra: limpiar campos de tiempo y permitir edición manual
          next.horaInicio = "";
          next.horaFin = "";
          next.horasInvertidas = "";
        }
      }

      // Recalcular horas invertidas automáticamente cuando cambian inicio/fin
      // SOLO si es hora extra (para mantener consistencia)
      if ((name === "horaInicio" || name === "horaFin") && next.horaExtra) {
        if (next.horaInicio && next.horaFin) {
          const v = computeHorasInvertidas(next.horaInicio, next.horaFin, true);
          next.horasInvertidas = v;
        }
      }

      // === Validación en vivo SOLO para horas ===
      if (name === "horaInicio") {
        const errInicio = errorOutsideRange();
        const errFin = computeHoraFinError(next.horaFin, next.horaInicio); // revalida fin
        setFormErrors((prevE) => ({
          ...prevE,
          horaInicio: errInicio,
          horaFin: errFin,
        }));
      } else if (name === "horaFin") {
        const errFin = computeHoraFinError(next.horaFin, next.horaInicio);
        setFormErrors((prevE) => ({ ...prevE, horaFin: errFin }));
      }

      return next;
    });
  };

  const handleJobChange = (
    _e: React.SyntheticEvent,
    value: JobConJerarquia | null
  ) => {
    setSelectedJob(value);
    setFormData((prev) => ({ ...prev, job: value ? value.id.toString() : "" }));
    if (formErrors.job) setFormErrors((prev) => ({ ...prev, job: "" }));
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    const { horaInicio, horaFin } = formData;

    if (!formData.descripcion.trim())
      errors.descripcion = "La descripción es obligatoria";
    if (!formData.job.trim()) errors.job = "El job es obligatorio";

    // Validar que solo se puedan ingresar horas extra cuando el progreso normal esté al 100%
    if (formData.horaExtra && !canAddExtraHours) {
      errors.horaExtra =
        "Solo puedes ingresar horas extra cuando hayas completado el 100% de las horas normales del día";
    }

    // Validar campos según si es hora extra o no
    if (formData.horaExtra) {
      // Para hora extra, los campos de tiempo son obligatorios
      if (!horaInicio) {
        errors.horaInicio = "Hora inicio obligatoria para hora extra";
      } else if (!isValidTimeFormat(horaInicio)) {
        errors.horaInicio = "Formato inválido. Use HH:MM";
      }

      if (!horaFin) {
        errors.horaFin = "Hora fin obligatoria para hora extra";
      } else if (!isValidTimeFormat(horaFin)) {
        errors.horaFin = "Formato inválido. Use HH:MM (máximo 24:00)";
      }

      // Para hora extra, las horas invertidas se calculan automáticamente
      // Validar que el cálculo sea válido
      if (horaInicio && horaFin) {
        const horasCalc = computeHorasInvertidas(horaInicio, horaFin, true);
        if (!horasCalc || parseFloat(horasCalc) <= 0) {
          errors.horasInvertidas = "Las horas calculadas no son válidas";
        }
      }
    } else {
      // Para actividades normales (no hora extra), las horas invertidas son obligatorias
      if (!formData.horasInvertidas.trim()) {
        errors.horasInvertidas =
          "Las horas invertidas son obligatorias para actividades normales";
      } else {
        const hours = parseFloat(formData.horasInvertidas);
        if (isNaN(hours) || hours <= 0) {
          errors.horasInvertidas = "Ingresa un número válido mayor a 0";
        } else {
          // Validar que no exceda las horas normales restantes del día
          if (horasDisponiblesValidacionForm <= 0) {
            errors.horasInvertidas =
              "Sin horas normales disponibles. Activa Hora Extra para continuar.";
          } else if (hours > horasDisponiblesValidacionForm) {
            errors.horasInvertidas = `Las horas exceden el límite disponible. Solo quedan ${horasDisponiblesValidacionForm.toFixed(
                2
            )} horas.`;
          }
        }
      }
    }

    if (horaInicio && horaFin) {
      const entradaMin = timeToMinutes(dayConfigData.horaEntrada);
      const salidaMin = timeToMinutes(dayConfigData.horaSalida);

      const inicioMin = timeToMinutes(horaInicio);
      let finMin = horaFin === "24:00" ? 1440 : timeToMinutes(horaFin);

      // Si fin <= inicio, la actividad cruza medianoche
      if (finMin <= inicioMin) {
        finMin += 1440;
      }

      const shouldValidateOutside =
        formData.horaExtra &&
        !(dayConfigData.horaEntrada === dayConfigData.horaSalida);

      if (shouldValidateOutside) {
        const laborIntervalsForValidation = buildIntervals(
          entradaMin,
          salidaMin
        );
        const activityIntervalsForValidation = splitActivityIntervals(
          inicioMin,
          formData.horaFin === "24:00" ? 1440 : timeToMinutes(formData.horaFin)
        );

        const overlapsSchedule = activityIntervalsForValidation.some(
          ([segStart, segEnd]) =>
            laborIntervalsForValidation.some(
              ([intStart, intEnd]) => segStart < intEnd && segEnd > intStart
            )
        );

        if (overlapsSchedule) {
          const rangoPermitido = laborIntervalsForValidation
            .map(
              ([start, end]) => `${minutesToHHMM(start)}-${minutesToHHMM(end)}`
            )
            .join(" y ");
          errors.horaInicio = `La hora extra debe estar fuera del horario laboral (${rangoPermitido})`;
          errors.horaFin = `La hora extra debe estar fuera del horario laboral (${rangoPermitido})`;
        }
      }

      // Validar relación inicio/fin
      if (
        timeToMinutes(horaFin) <= timeToMinutes(horaInicio) &&
        finMin <= inicioMin + 1440
      ) {
        errors.horaFin = "La hora final debe ser posterior a la inicial";
      }

      // === Validación: no solaparse con otras actividades ===
      if (
        registroDiario?.actividades &&
        registroDiario.actividades.length > 0
      ) {
        const overlaps = registroDiario.actividades.some((act) => {
          // Excluir la actividad que se está editando (comparar por ID si existe)
          if (editingActivity) {
            // Si ambas tienen ID, comparar por ID (más confiable)
            if (editingActivity.id && act.id && editingActivity.id === act.id) {
              return false;
            }
            // Si no tienen ID, comparar por referencia (para actividades nuevas aún no guardadas)
            if (editingActivity === act) {
              return false;
            }
          }

          if (!act.horaInicio || !act.horaFin) return false;

          const actInicioMin = timeToMinutes(formatTimeLocal(act.horaInicio));
          let actFinMin = timeToMinutes(formatTimeLocal(act.horaFin));

          // Si la actividad guardada termina en 00:00 del día siguiente,
          // su fin será <= inicio; en ese caso sumamos 1440 para comparar correctamente
          if (actFinMin <= actInicioMin) {
            actFinMin += 1440;
          }

          return inicioMin < actFinMin && actInicioMin < finMin;
        });

        if (overlaps) {
          errors.horaInicio = "Este horario se solapa con otra actividad";
          errors.horaFin = "Este horario se solapa con otra actividad";
        }
      }
    }

    // Regla global: si el día no tiene horas normales o las horas restantes son 0, no se permiten actividades normales
    if (
      !formData.horaExtra &&
      (horasNormales === 0 || horasDisponiblesValidacionForm <= 0)
    ) {
      errors.horasInvertidas =
        horasNormales === 0
          ? "Este día no tiene horas normales; utiliza Hora Extra."
          : "Sin horas normales disponibles. Activa Hora Extra para continuar.";
      setFormErrors(errors);
      return false;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);

      // Construir ISO para inicio/fin (si el fin es <= inicio, poner fin al DÍA SIGUIENTE)
      const startM = timeToMinutes(formData.horaInicio);
      const endM =
        formData.horaFin === "24:00" ? 1440 : timeToMinutes(formData.horaFin);
      const addDay = endM <= startM ? 1 : 0;

      const actividad: any = {
        jobId: parseInt(formData.job),
        esExtra: formData.horaExtra,
        className: formData.class || undefined,
        descripcion: formData.descripcion,
      };

      // Solo agregar datos de tiempo si es hora extra
      if (formData.horaExtra) {
        actividad.duracionHoras = parseFloat(
          computeHorasInvertidas(formData.horaInicio, formData.horaFin, true)
        );
        actividad.horaInicio = buildISO(currentDate, formData.horaInicio, 0);
        actividad.horaFin = buildISO(currentDate, formData.horaFin, addDay);
      } else {
        // Para actividades normales, usar las horas invertidas ingresadas manualmente
        actividad.duracionHoras = parseFloat(formData.horasInvertidas || "0");
        actividad.horaInicio = undefined;
        actividad.horaFin = undefined;
      }

      if (registroDiario) {
        // Obtener actividades existentes
        const actividadesExistentes =
          registroDiario.actividades?.map((act) => ({
            jobId: act.jobId,
            duracionHoras: act.duracionHoras,
            esExtra: act.esExtra,
            className: act.className,
            descripcion: act.descripcion,
            horaInicio: act.horaInicio,
            horaFin: act.horaFin,
          })) || [];

        let actividadesActualizadas;

        if (editingActivity && editingIndex >= 0) {
          // Si estamos editando, reemplazar la actividad en el índice específico
          actividadesActualizadas = [...actividadesExistentes];
          actividadesActualizadas[editingIndex] = actividad;
        } else {
          // Si es nueva actividad, agregar al final
          actividadesActualizadas = [...actividadesExistentes, actividad];
        }

        // Construir ISO para entrada/salida usando valores actuales de dayConfigData
        const entradaM = timeToMinutes(dayConfigData.horaEntrada);
        const salidaM = timeToMinutes(dayConfigData.horaSalida);
        const addDayForEnd = salidaM <= entradaM ? 1 : 0;

        // Calcular horas feriado si es día festivo
        const horasFeriado =
          horarioData?.esFestivo && horarioData.cantidadHorasLaborablesNormales
            ? horarioData.cantidadHorasLaborablesNormales
            : undefined;

        const params = {
          fecha: dateString,
          horaEntrada: buildISO(currentDate, dayConfigData.horaEntrada, 0),
          horaSalida: buildISO(
            currentDate,
            dayConfigData.horaSalida,
            addDayForEnd
          ),
          jornada: dayConfigData.jornada,
          esDiaLibre: dayConfigData.esDiaLibre,
          esIncapacidad: dayConfigData.esIncapacidad,
          esHoraCorrida: isH2 ? true : dayConfigData.esHoraCorrida,
          comentarioEmpleado: dayConfigData.comentarioEmpleado,
          ...(horasFeriado !== undefined && { horasFeriado }),
          actividades: actividadesActualizadas,
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      } else {
        // Si no existe registro, validar configuración del día y crear nuevo registro
        if (!validateDayConfig()) return;

        const entradaM = timeToMinutes(dayConfigData.horaEntrada);
        const salidaM = timeToMinutes(dayConfigData.horaSalida);
        const addDayForEnd = salidaM <= entradaM ? 1 : 0;

        // Calcular horas feriado si es día festivo
        const horasFeriado =
          horarioData?.esFestivo && horarioData.cantidadHorasLaborablesNormales
            ? horarioData.cantidadHorasLaborablesNormales
            : undefined;

        const params = {
          fecha: dateString,
          horaEntrada: buildISO(currentDate, dayConfigData.horaEntrada, 0),
          horaSalida: buildISO(
            currentDate,
            dayConfigData.horaSalida,
            addDayForEnd
          ),
          jornada: dayConfigData.jornada,
          esDiaLibre: dayConfigData.esDiaLibre,
          esIncapacidad: dayConfigData.esIncapacidad,
          // Si es H2, enviar esHoraCorrida=true al backend
          esHoraCorrida: isH2 ? true : dayConfigData.esHoraCorrida,
          comentarioEmpleado: dayConfigData.comentarioEmpleado,
          ...(horasFeriado !== undefined && { horasFeriado }),
          actividades: [actividad],
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      }

      const actionMessage = editingActivity
        ? "Actividad actualizada correctamente"
        : "Actividad guardada correctamente";
      setSnackbar({ open: true, message: actionMessage, severity: "success" });
      handleDrawerClose();
    } catch (e) {
      console.error("Error al guardar actividad:", e);
      const message = (e as Error).message || "Error al guardar la actividad";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ===== Navegación de fecha =====
  const formatDate = (date: Date) => {
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
    return `${days[date.getDay()]}, ${date.getDate()} de ${
      months[date.getMonth()]
    } de ${date.getFullYear()}`;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + (direction === "prev" ? -1 : 1));
    setInitialLoading(true); // Activar loading cuando cambie la fecha
    setCurrentDate(d);
    // Actualizar URL con la nueva fecha
    const fechaString = ymdInTZ(d);
    navigate(`/registro-actividades/${fechaString}`);
  };
  const goToToday = () => {
    const today = new Date();
    setInitialLoading(true); // Activar loading cuando vaya a hoy
    setCurrentDate(today);
    // Actualizar URL con la fecha de hoy
    const fechaString = ymdInTZ(today);
    navigate(`/registro-actividades/${fechaString}`);
  };
  const isToday = () => ymdInTZ(currentDate) === ymdInTZ(new Date());

  // ===== Horas trabajadas / Totales & progreso =====

  // SUMA de horas NORMALES (sin horas extra) para el progreso del día
  const workedHoursNormales =
    registroDiario?.actividades?.reduce((acc, act) => {
      if (!act.esExtra) {
        // Para actividades normales, usar duracionHoras
        return acc + (act.duracionHoras || 0);
      }
      return acc;
    }, 0) || 0;

  // Calcular horas normales usando reglas del horario
  const horasNormales = HorarioRulesFactory.calculateNormalHours(
    horarioValidado?.tipoHorario,
    dayConfigData,
    horarioValidado,
    { now: currentDate }
  );

  // Progreso basado SOLO en horas normales (sin horas extra)
  const progressPercentage =
    horasNormales === 0
      ? 100
      : HorarioValidator.getProgressPercentage(
          workedHoursNormales,
          horasNormales
        );
  const horasFaltantesMessage = HorarioValidator.getHorasFaltantesMessage(
    workedHoursNormales,
    horasNormales
  );

  const horasRestantesDia = Math.max(0, horasNormales - workedHoursNormales);
  const editingHoursNormales =
    editingActivity && !editingActivity.esExtra
      ? editingActivity.duracionHoras || 0
      : 0;
  const horasDisponiblesValidacionForm =
    horasRestantesDia + editingHoursNormales;

  // Verificar si se pueden ingresar horas extra (solo cuando progreso normal = 100%)
  const canAddExtraHours = horasNormales === 0 || horasRestantesDia <= 0.01;
  // === NUEVO: bloquear checkbox Hora Corrida cuando es H2 ===
  const disableHoraCorrida = isH2 || (horasNormales === 0 && isH1);
  const disableTimeFields = dayConfigData.esDiaLibre || dayConfigData.esIncapacidad || isHoliday;
  
  /**
   * REGLA DE NEGOCIO CRÍTICA: INCAPACIDAD
   * 
   * Cuando esIncapacidad = true:
   * - NO se pueden crear nuevas actividades
   * - NO se pueden editar actividades existentes
   * - SÍ se pueden eliminar actividades (deben hacerlo manualmente)
   * 
   * Esto aplica a TODOS los tipos de horarios (H1, H2, H1_1, H1_2, etc.).
   * 
   * RAZÓN: Un empleado en incapacidad no puede registrar nuevas actividades laborales,
   * pero puede eliminar las actividades que ya tenía registradas antes de marcar incapacidad.
   * 
   * IMPLEMENTACIÓN:
   * - disableCreateEditActivities se usa para deshabilitar:
   *   * Botón "Nueva Actividad" (desktop y mobile)
   *   * Botón "Editar" en cada actividad
   *   * FAB (Floating Action Button) en mobile
   * - El botón "Eliminar" NO se deshabilita cuando hay incapacidad
   * 
   * IMPORTANTE: No remover esta lógica sin revisar primero las reglas de negocio
   * documentadas en los archivos H1Rules.ts, H2Rules.ts, DefaultRules.ts
   * 
   * NOTA PARA IA: Este comportamiento está documentado en las reglas de horario.
   * No modificar sin entender el impacto en la lógica de negocio.
   */
  const isIncapacidad = dayConfigData.esIncapacidad || false;
  const disableCreateEditActivities = readOnly || isIncapacidad;

  /**
   * Calcular si se exceden las horas normales.
   * Se considera excedencia cuando las horas trabajadas son mayores que las horas normales disponibles.
   * Esto incluye casos donde:
   * - horasNormales > 0 y workedHoursNormales > horasNormales
   * - horasNormales === 0 y workedHoursNormales > 0 (ej: incapacidad marcada o día libre)
   * - horasNormales se redujo después de tener actividades guardadas (ej: cambio de horario)
   */
  const exceededNormalHours = Math.max(0, workedHoursNormales - horasNormales);
  const hasExceededNormalHours = workedHoursNormales > horasNormales;

  // Estado del registro diario
  const hasDayRecord = Boolean(registroDiario);
  const dayConfigHasChanges = hasChangesInDayConfig();
  const forceExtra = horasNormales === 0;
  const horasCero = horasNormales === 0;

  // Lógica global: controlar checkbox Hora Extra automáticamente según progreso (aplica a todos los tipos de horario)
  const shouldForceExtra = !editingActivity;
  const isProgressComplete = horasRestantesDia <= 0.01;
  const isProgressIncomplete = horasRestantesDia > 0.01;

  // Quitar forzado de esHoraCorrida en UI para H2

  React.useEffect(() => {
    if (horasCero) {
      setDayConfigData((prev) => {
        // Respetar esDiaLibre proveniente del horario (API) y solo forzar esHoraCorrida=false
        if (!prev.esHoraCorrida) return prev;
        return { ...prev, esHoraCorrida: false };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horasCero, dayConfigData.horaEntrada, dayConfigData.horaSalida]);

  React.useEffect(() => {
    if (horarioValidado?.tipoHorario !== "H2") return;
    setDayConfigData((prev) => {
      if (prev.esDiaLibre || prev.esIncapacidad) {
        if (
          prev.horaEntrada === "07:00" &&
          prev.horaSalida === "07:00" &&
          prev.jornada === ""
        ) {
          return prev;
        }
        return {
          ...prev,
          horaEntrada: "07:00",
          horaSalida: "07:00",
          jornada: "",
        };
      }

      if (!prev.jornada) return prev;

      const schedule = getH2Schedule(prev.jornada, currentDate);
      if (!schedule) return prev;
      if (
        prev.horaEntrada === schedule.horaEntrada &&
        prev.horaSalida === schedule.horaSalida
      ) {
        return prev;
      }

      return {
        ...prev,
        horaEntrada: schedule.horaEntrada,
        horaSalida: schedule.horaSalida,
      };
    });
  }, [currentDate, getH2Schedule, horarioValidado?.tipoHorario]);

  // Recalcular horasInvertidas cuando cambia hora corrida / entrada / salida
  React.useEffect(() => {
    setFormData((prev) => {
      if (!prev.horaInicio || !prev.horaFin) return prev;
      const v = computeHorasInvertidas(
        prev.horaInicio,
        prev.horaFin,
        prev.horaExtra
      );
      return v === prev.horasInvertidas
        ? prev
        : { ...prev, horasInvertidas: v };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dayConfigData.esHoraCorrida,
    dayConfigData.horaEntrada,
    dayConfigData.horaSalida,
  ]);

  // Recalcular horasInvertidas cuando cambian los campos de tiempo del formulario
  React.useEffect(() => {
    const { horaInicio, horaFin, horaExtra } = formData;
    if (horaInicio && horaFin) {
      const v = computeHorasInvertidas(horaInicio, horaFin, horaExtra);
      setFormData((prev) => ({ ...prev, horasInvertidas: v }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.horaInicio, formData.horaFin]);

  // Efecto global para controlar automáticamente el checkbox "Hora Extra" según progreso (aplica a todos los tipos de horario)
  React.useEffect(() => {
    if (shouldForceExtra && drawerOpen) {
      setFormData((prev) => {
        let needsUpdate = false;
        let newFormData = prev;

        if (isProgressComplete && !prev.horaExtra) {
          // Progreso completo: marcar Hora Extra y limpiar campos
          newFormData = {
            ...prev,
            horaExtra: true,
            horasInvertidas: "",
            horaInicio: "",
            horaFin: "",
            job: "", // Limpiar job seleccionado
          };
          needsUpdate = true;
        } else if (isProgressIncomplete && prev.horaExtra) {
          // Progreso incompleto: desmarcar Hora Extra y limpiar campos
          newFormData = {
            ...prev,
            horaExtra: false,
            horasInvertidas: "",
            horaInicio: "",
            horaFin: "",
            job: "", // Limpiar job seleccionado
          };
          needsUpdate = true;
        }

        // Si cambió el estado de horaExtra, recargar jobs y limpiar job seleccionado
        if (needsUpdate && newFormData.horaExtra !== prev.horaExtra) {
          setSelectedJob(null);
          // Recargar jobs después de un pequeño delay para que el estado se actualice
          setTimeout(() => {
            loadJobs();
          }, 0);
        }

        return newFormData;
      });
    }
  }, [shouldForceExtra, isProgressComplete, isProgressIncomplete, drawerOpen]);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        maxWidth: "100%",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant={isMobile ? "h5" : "h5"}
          component="h1"
          sx={{ fontWeight: "bold", minWidth: 0 }}
        >
          Registro de Actividades
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <IconButton onClick={() => navigateDate("prev")} size="small">
            <ChevronLeft />
          </IconButton>
          <Button
            variant={isToday() ? "contained" : "outlined"}
            startIcon={<CalendarToday />}
            onClick={goToToday}
            size="small"
            sx={{ minWidth: "auto" }}
          >
            {isToday() ? "Hoy" : "Hoy"}
          </Button>
          <IconButton onClick={() => navigateDate("next")} size="small">
            <ChevronRight />
          </IconButton>
          <Button
            variant={hasDayRecord ? "outlined" : "contained"}
            startIcon={
              initialLoading ? <CircularProgress size={16} /> : <Settings />
            }
            onClick={handleDayConfigSubmit}
            size="small"
            color={hasDayRecord ? "success" : "primary"}
            sx={{ ml: 1 }}
            disabled={
              initialLoading ||
              loading ||
              (hasDayRecord && !dayConfigHasChanges)
            }
          >
            {initialLoading
              ? "Cargando..."
              : loading
              ? "Guardando..."
              : hasDayRecord
              ? "Actualizar Día"
              : "Guardar Día"}
          </Button>
        </Box>
      </Box>

      {/* Fecha actual */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 1, textAlign: "center" }}
      >
        {formatDate(currentDate)}
      </Typography>

      {/* Info del día */}
      {registroDiario && (
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 2 }}
        >
          {horarioValidado?.mostrarJornada && (
            <Chip
              label={`Jornada: ${
                registroDiario.jornada === "D"
                  ? "Dia"
                  : registroDiario.jornada === "N"
                  ? "Noche"
                  : ""
              }`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          <Chip
            label={`${formatTimeLocal(
              registroDiario.horaEntrada
            )} - ${formatTimeLocal(registroDiario.horaSalida)}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          {registroDiario.esDiaLibre && (
            <Chip
              label="Día Libre"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {registroDiario.esIncapacidad && (
            <Chip
              label="Incapacidad"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {/* Mostrar Hora Corrida solo si NO es H2 (para H2 ocultar) */}
          {!isH2 && registroDiario.esHoraCorrida && (
            <Chip
              label="Hora Corrida"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>
      )}

      {/* Mostrar nombre del día festivo si es festivo */}
      {horarioValidado?.mostrarNombreFestivo &&
        horarioValidado.nombreDiaFestivo && (
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Chip
              label={`🎉 ${horarioValidado.nombreDiaFestivo}`}
              size="medium"
              color="success"
              variant="filled"
            />
            {/* Mostrar horas feriado: usar las horas normales que se habrían trabajado si no fuera feriado */}
            {horarioData?.esFestivo &&
              horarioData.cantidadHorasLaborablesNormales !== undefined &&
              horarioData.cantidadHorasLaborablesNormales > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Horas laborables asignadas a feriado:{" "}
                  <strong>
                    {horarioData.cantidadHorasLaborablesNormales.toFixed(2)}h
                  </strong>
                </Typography>
              )}
          </Box>
        )}

      {/* Saludo */}
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ mb: 3, textAlign: "center", fontWeight: "medium" }}
      >
        ¡Buen día, {user?.nombre}! 👋
      </Typography>

      {/* Configuración del día */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Typography
            variant="h6"
            component="h2"
            sx={{ mb: 3, fontWeight: "bold" }}
          >
            Configuración del Día Laboral
          </Typography>
          {/* Los valores se configuran automáticamente desde la API cuando no hay datos existentes */}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            <TextField
              disabled={
                readOnly ||
                initialLoading ||
                disableTimeFields ||
                !horarioRules.utils.isFieldEnabled("horaEntrada")
              }
              fullWidth
              required
              type="time"
              name="horaEntrada"
              label="Hora de Entrada"
              value={initialLoading ? "" : dayConfigData.horaEntrada}
              onChange={handleDayConfigInputChange}
              onKeyDown={handleDayConfigTimeKeyDown}
              error={!!dayConfigErrors.horaEntrada}
              helperText={dayConfigErrors.horaEntrada}
              InputLabelProps={{ shrink: true }}
              size="small"
              inputProps={{
                step: 900, // 15 minutos en segundos
              }}
              placeholder={initialLoading ? "Cargando..." : ""}
            />

            {/* Hora de Salida */}
            <TextField
              disabled={
                readOnly ||
                initialLoading ||
                disableTimeFields ||
                !horarioRules.utils.isFieldEnabled("horaSalida")
              }
              fullWidth
              required
              type="time"
              name="horaSalida"
              label="Hora de Salida"
              value={initialLoading ? "" : dayConfigData.horaSalida}
              onChange={handleDayConfigInputChange}
              onKeyDown={handleDayConfigTimeKeyDown}
              error={!!dayConfigErrors.horaSalida}
              helperText={dayConfigErrors.horaSalida}
              InputLabelProps={{ shrink: true }}
              size="small"
              inputProps={{
                step: 900, // 15 minutos en segundos
              }}
              placeholder={initialLoading ? "Cargando..." : ""}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Jornada según reglas */}
            {horarioRules.utils.isFieldVisible("jornada") && (
              <FormControl fullWidth size="small">
                <InputLabel>Jornada</InputLabel>
                <Select
                  disabled={
                    readOnly ||
                    initialLoading ||
                    dayConfigData.esDiaLibre ||
                    !horarioRules.utils.isFieldEnabled("jornada")
                  }
                  name="jornada"
                  value={initialLoading ? "" : dayConfigData.jornada}
                  onChange={(e) =>
                    handleDayConfigInputChange(
                      e as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                  label="Jornada"
                >
                  <MenuItem value="D">Día</MenuItem>
                  <MenuItem value="N">Noche</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Es Día Libre */}
            {horarioRules.utils.isFieldVisible("esDiaLibre") && (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "40px" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={
                        readOnly ||
                        initialLoading ||
                        !horarioRules.utils.isFieldEnabled("esDiaLibre") ||
                        (isH2 && isIncapacidad) // En H2, deshabilitar Día Libre cuando hay incapacidad
                      }
                      name="esDiaLibre"
                      checked={dayConfigData.esDiaLibre}
                      onChange={handleDayConfigInputChange}
                      color="primary"
                    />
                  }
                  label="Día Libre"
                />
              </Box>
            )}
            {/* Es Incapacidad */}
            <Box
              sx={{ display: "flex", alignItems: "center", height: "40px" }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={readOnly || initialLoading}
                    name="esIncapacidad"
                    checked={dayConfigData.esIncapacidad}
                    onChange={handleDayConfigInputChange}
                    color="primary"
                  />
                }
                label="Incapacidad"
              />
            </Box>
            {/* Es Hora Corrida */}
            {horarioRules.utils.isFieldVisible("esHoraCorrida") && (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "40px" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={
                        readOnly ||
                        initialLoading ||
                        horasCero ||
                        disableHoraCorrida ||
                        !horarioRules.utils.isFieldEnabled("esHoraCorrida")
                      }
                      name="esHoraCorrida"
                      checked={
                        initialLoading ? false : dayConfigData.esHoraCorrida
                      }
                      onChange={handleDayConfigInputChange}
                      color="primary"
                    />
                  }
                  label="Hora Corrida"
                />
              </Box>
            )}
          </Box>

          {/* Comentario del Colaborador */}
          <TextField
            disabled={readOnly || initialLoading}
            fullWidth
            multiline
            rows={2}
            name="comentarioEmpleado"
            label="Comentario (opcional)"
            placeholder={
              initialLoading
                ? "Cargando..."
                : "Agregar comentarios adicionales..."
            }
            value={initialLoading ? "" : dayConfigData.comentarioEmpleado}
            onChange={handleDayConfigInputChange}
            size="small"
            inputProps={{ maxLength: 500 }}
            helperText={`${
              (dayConfigData.comentarioEmpleado || "").length
            }/500 caracteres`}
          />
        </CardContent>
      </Card>

      {/* Comentarios de Supervisor y RRHH (solo si fueron rechazados) */}
      {(registroDiario?.aprobacionSupervisor === false ||
        registroDiario?.aprobacionRrhh === false) && (
        <Box sx={{ mb: 3 }}>
          {registroDiario.aprobacionSupervisor === false && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1, color: "error.main" }}
              >
                Rechazado por Supervisor
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "error.dark",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {registroDiario.comentarioSupervisor || "Sin comentario"}
              </Typography>
            </Alert>
          )}

          {registroDiario.aprobacionRrhh === false && (
            <Alert
              severity="error"
              sx={{
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1, color: "error.main" }}
              >
                Rechazado por RRHH
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "error.dark",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {registroDiario.comentarioRrhh || "Sin comentario"}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Progreso */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <AccessTime sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" component="h2">
              Progreso del Día Laboral
            </Typography>
            <Box sx={{ ml: "auto" }}>
              {initialLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography
                  variant="body2"
                  color={hasExceededNormalHours ? "error.main" : "primary.main"}
                  fontWeight="bold"
                >
                  {workedHoursNormales.toFixed(2)} / {horasNormales.toFixed(2)}{" "}
                  horas
                </Typography>
              )}
              {/* Las horas normales se obtienen desde la API usando cantidadHorasLaborables */}
            </Box>
          </Box>

          {initialLoading ? (
            <LinearProgress sx={{ height: 8, borderRadius: 4, mb: 2 }} />
          ) : (
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              color={hasExceededNormalHours ? "error" : "primary"}
              sx={{
                height: 8,
                borderRadius: 4,
                mb: 2,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": { borderRadius: 4 },
              }}
            />
          )}

          {initialLoading ? (
            <Typography variant="body2" color="warning.main">
              Calculando progreso...
            </Typography>
          ) : hasExceededNormalHours ? (
            <Typography variant="body2" color="error.main" fontWeight="bold">
              Se exceden las horas normales para este día
            </Typography>
          ) : (
            <Typography variant="body2" color="warning.main">
              {horasFaltantesMessage}
            </Typography>
          )}
          {/* El mensaje se calcula usando las horas normales obtenidas desde la API */}
        </CardContent>
      </Card>

      {/* Lista de actividades */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" component="h2">
          Actividades de Hoy
        </Typography>
        {!isMobile && (
          <Button
            disabled={disableCreateEditActivities || initialLoading}
            variant="contained"
            startIcon={
              initialLoading ? <CircularProgress size={16} /> : <Add />
            }
            sx={{ borderRadius: 2 }}
            onClick={handleDrawerOpen}
            title={isIncapacidad ? "No se pueden agregar actividades cuando hay incapacidad" : ""}
          >
            {initialLoading ? "Cargando..." : "Nueva Actividad"}
          </Button>
        )}
      </Box>

      {/* Activities list or empty state */}
      {initialLoading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            textAlign: "center",
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 4,
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.primary" gutterBottom>
            Cargando actividades...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Obteniendo los datos del día
          </Typography>
        </Box>
      ) : registroDiario?.actividades &&
        registroDiario.actividades.length > 0 ? (
        <Stack spacing={2}>
          {(() => {
            // Obtener horas de entrada y salida en minutos para comparar
            const entradaMin = registroDiario.horaEntrada
              ? timeToMinutes(formatTimeLocal(registroDiario.horaEntrada))
              : 0;
            const salidaMin = registroDiario.horaSalida
              ? timeToMinutes(formatTimeLocal(registroDiario.horaSalida))
              : 1440;

            // Clasificar actividades en tres grupos
            const extrasAntesEntrada: typeof registroDiario.actividades = [];
            const normales: typeof registroDiario.actividades = [];
            const extrasDespuesSalida: typeof registroDiario.actividades = [];

            registroDiario.actividades.forEach((act) => {
              if (!act.esExtra) {
                // Actividades normales
                normales.push(act);
              } else if (act.horaInicio) {
                // Actividades extra con hora de inicio
                const inicioMin = timeToMinutes(
                  formatTimeLocal(act.horaInicio)
                );
                if (inicioMin < entradaMin) {
                  // Extra antes de la hora de entrada
                  extrasAntesEntrada.push(act);
                } else if (inicioMin >= salidaMin) {
                  // Extra después o igual a la hora de salida
                  extrasDespuesSalida.push(act);
                } else {
                  // Extra dentro del horario laboral (no debería pasar, pero por si acaso)
                  normales.push(act);
                }
              } else {
                // Extra sin hora de inicio (caso especial)
                normales.push(act);
              }
            });

            // Ordenar extras por hora de inicio ascendente
            extrasAntesEntrada.sort((a, b) => {
              if (!a.horaInicio || !b.horaInicio) return 0;
              const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
              const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
              return aMin - bMin;
            });

            extrasDespuesSalida.sort((a, b) => {
              if (!a.horaInicio || !b.horaInicio) return 0;
              const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
              const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
              return aMin - bMin;
            });

            // Concatenar en el orden correcto: extras antes, normales, extras después
            const actividadesOrdenadas = [
              ...extrasAntesEntrada,
              ...normales,
              ...extrasDespuesSalida,
            ];

            // Verificar si hay horas laborables (horaEntrada !== horaSalida)
            const tieneHorasLaborables =
              registroDiario.horaEntrada &&
              registroDiario.horaSalida &&
              formatTimeLocal(registroDiario.horaEntrada) !==
                formatTimeLocal(registroDiario.horaSalida);

            // Crear array con actividades y espacios libres
            type ActividadConLibre =
              | ((typeof actividadesOrdenadas)[0] & { tipo: "actividad" })
              | { tipo: "libre"; horaInicio: string; horaFin: string };

            const actividadesConLibres: ActividadConLibre[] = [];

            // Helper para crear espacio libre
            const crearEspacioLibre = (
              horaInicioMin: number,
              horaFinMin: number
            ): ActividadConLibre => {
              return {
                tipo: "libre",
                horaInicio: `${Math.floor(horaInicioMin / 60)
                  .toString()
                  .padStart(2, "0")}:${(horaInicioMin % 60)
                  .toString()
                  .padStart(2, "0")}`,
                horaFin: `${Math.floor(horaFinMin / 60)
                  .toString()
                  .padStart(2, "0")}:${(horaFinMin % 60)
                  .toString()
                  .padStart(2, "0")}`,
              };
            };

            // Filtrar solo actividades con horaInicio y horaFin para detectar espacios
            const actividadesConHora = actividadesOrdenadas.filter(
              (act) => act.horaInicio && act.horaFin
            );

            if (tieneHorasLaborables && actividadesConHora.length > 0) {
              // Caso 1: Hay horas laborables - solo mostrar espacios libres ANTES de entrada y DESPUÉS de salida

              // Separar actividades extra en dos grupos: antes de entrada y después de salida
              const actividadesAntesEntrada = actividadesConHora.filter(
                (act) => {
                  if (!act.horaInicio) return false;
                  const inicioMin = timeToMinutes(
                    formatTimeLocal(act.horaInicio)
                  );
                  return inicioMin < entradaMin;
                }
              );

              const actividadesDespuesSalida = actividadesConHora.filter(
                (act) => {
                  if (!act.horaInicio) return false;
                  const inicioMin = timeToMinutes(
                    formatTimeLocal(act.horaInicio)
                  );
                  return inicioMin >= salidaMin;
                }
              );

              // Procesar todas las actividades en orden primero
              actividadesOrdenadas.forEach((act) => {
                actividadesConLibres.push({
                  ...act,
                  tipo: "actividad",
                });
              });

              // Ordenar actividades antes de entrada por horaInicio
              actividadesAntesEntrada.sort((a, b) => {
                if (!a.horaInicio || !b.horaInicio) return 0;
                const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
                const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
                return aMin - bMin;
              });

              // Espacios libres entre actividades ANTES de horaEntrada
              for (let i = 0; i < actividadesAntesEntrada.length; i++) {
                const act = actividadesAntesEntrada[i];
                if (!act.horaFin) continue;

                const finActMin = timeToMinutes(formatTimeLocal(act.horaFin));
                let inicioSigMin: number | null = null;

                // Buscar siguiente actividad antes de entrada
                if (i < actividadesAntesEntrada.length - 1) {
                  const sigAct = actividadesAntesEntrada[i + 1];
                  if (sigAct.horaInicio) {
                    inicioSigMin = timeToMinutes(
                      formatTimeLocal(sigAct.horaInicio)
                    );
                  }
                } else {
                  // Es la última actividad antes de entrada, el siguiente límite es horaEntrada
                  inicioSigMin = entradaMin;
                }

                if (inicioSigMin !== null && inicioSigMin > finActMin) {
                  const espacioLibre = crearEspacioLibre(
                    finActMin,
                    inicioSigMin
                  );
                  const indiceAct = actividadesConLibres.findIndex(
                    (item) =>
                      item.tipo === "actividad" &&
                      (item as typeof act).id === act.id &&
                      (item as typeof act).horaInicio === act.horaInicio
                  );
                  if (indiceAct >= 0) {
                    actividadesConLibres.splice(indiceAct + 1, 0, espacioLibre);
                  }
                }
              }

              // Ordenar actividades después de salida por horaInicio
              actividadesDespuesSalida.sort((a, b) => {
                if (!a.horaInicio || !b.horaInicio) return 0;
                const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
                const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
                return aMin - bMin;
              });

              // Espacio libre entre horaSalida y primera actividad DESPUÉS de salida
              if (actividadesDespuesSalida.length > 0) {
                const primeraActDespues = actividadesDespuesSalida[0];
                if (primeraActDespues.horaInicio) {
                  const inicioPrimeraMin = timeToMinutes(
                    formatTimeLocal(primeraActDespues.horaInicio)
                  );
                  if (inicioPrimeraMin > salidaMin) {
                    const espacioLibre = crearEspacioLibre(
                      salidaMin,
                      inicioPrimeraMin
                    );
                    const indicePrimera = actividadesConLibres.findIndex(
                      (item) =>
                        item.tipo === "actividad" &&
                        (item as typeof primeraActDespues).id ===
                          primeraActDespues.id &&
                        (item as typeof primeraActDespues).horaInicio ===
                          primeraActDespues.horaInicio
                    );
                    if (indicePrimera >= 0) {
                      actividadesConLibres.splice(
                        indicePrimera,
                        0,
                        espacioLibre
                      );
                    }
                  }
                }
              }

              // Espacios libres entre actividades DESPUÉS de horaSalida
              for (let i = 0; i < actividadesDespuesSalida.length - 1; i++) {
                const actActual = actividadesDespuesSalida[i];
                const actSiguiente = actividadesDespuesSalida[i + 1];
                if (actActual.horaFin && actSiguiente.horaInicio) {
                  const finActMin = timeToMinutes(
                    formatTimeLocal(actActual.horaFin)
                  );
                  const inicioSigMin = timeToMinutes(
                    formatTimeLocal(actSiguiente.horaInicio)
                  );
                  if (inicioSigMin > finActMin) {
                    const espacioLibre = crearEspacioLibre(
                      finActMin,
                      inicioSigMin
                    );
                    const indiceActActual = actividadesConLibres.findIndex(
                      (item) =>
                        item.tipo === "actividad" &&
                        (item as typeof actActual).id === actActual.id &&
                        (item as typeof actActual).horaInicio ===
                          actActual.horaInicio
                    );
                    if (indiceActActual >= 0) {
                      let posicionInsercion = indiceActActual + 1;
                      while (
                        posicionInsercion < actividadesConLibres.length &&
                        actividadesConLibres[posicionInsercion].tipo ===
                          "actividad" &&
                        (
                          actividadesConLibres[
                            posicionInsercion
                          ] as typeof actSiguiente
                        ).id !== actSiguiente.id
                      ) {
                        posicionInsercion++;
                      }
                      actividadesConLibres.splice(
                        posicionInsercion,
                        0,
                        espacioLibre
                      );
                    }
                  }
                }
              }
            } else if (!tieneHorasLaborables && actividadesConHora.length > 0) {
              // Caso 2: No hay horas laborables - solo considerar espacios entre horas extra
              // Ordenar actividades con hora por horaInicio
              const actividadesConHoraOrdenadas = [...actividadesConHora].sort(
                (a, b) => {
                  if (!a.horaInicio || !b.horaInicio) return 0;
                  const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
                  const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
                  return aMin - bMin;
                }
              );

              // Procesar todas las actividades
              actividadesOrdenadas.forEach((act) => {
                actividadesConLibres.push({
                  ...act,
                  tipo: "actividad",
                });
              });

              // Agregar espacios libres entre actividades con hora
              for (let i = 0; i < actividadesConHoraOrdenadas.length - 1; i++) {
                const actActual = actividadesConHoraOrdenadas[i];
                const actSiguiente = actividadesConHoraOrdenadas[i + 1];
                if (actActual.horaFin && actSiguiente.horaInicio) {
                  const finActMin = timeToMinutes(
                    formatTimeLocal(actActual.horaFin)
                  );
                  const inicioSigMin = timeToMinutes(
                    formatTimeLocal(actSiguiente.horaInicio)
                  );
                  if (inicioSigMin > finActMin) {
                    const espacioLibre = crearEspacioLibre(
                      finActMin,
                      inicioSigMin
                    );
                    // Insertar después de la actividad actual
                    const indiceActActual = actividadesConLibres.findIndex(
                      (item) =>
                        item.tipo === "actividad" &&
                        (item as typeof actActual).id === actActual.id &&
                        (item as typeof actActual).horaInicio ===
                          actActual.horaInicio
                    );
                    if (indiceActActual >= 0) {
                      let posicionInsercion = indiceActActual + 1;
                      while (
                        posicionInsercion < actividadesConLibres.length &&
                        actividadesConLibres[posicionInsercion].tipo ===
                          "actividad" &&
                        (
                          actividadesConLibres[
                            posicionInsercion
                          ] as typeof actSiguiente
                        ).id !== actSiguiente.id
                      ) {
                        posicionInsercion++;
                      }
                      actividadesConLibres.splice(
                        posicionInsercion,
                        0,
                        espacioLibre
                      );
                    }
                  }
                }
              }
            } else {
              // No hay actividades con hora, solo agregar todas sin espacios libres
              actividadesOrdenadas.forEach((act) => {
                actividadesConLibres.push({
                  ...act,
                  tipo: "actividad",
                });
              });
            }

            return actividadesConLibres.map((item, index) => {
              // Si es un espacio libre, renderizar card especial
              if (item.tipo === "libre") {
                return (
                  <Card
                    key={`libre-${index}`}
                    sx={{
                      bgcolor: "rgba(255, 182, 193, 0.3)", // Color rojo suave pastel para espacios libres
                      borderLeft: "4px solid rgba(255, 99, 71, 0.4)",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ fontStyle: "italic", textAlign: "center" }}
                      >
                        Libre ({item.horaInicio} - {item.horaFin})
                      </Typography>
                    </CardContent>
                  </Card>
                );
              }

              // Si es una actividad normal, renderizar como antes
              const actividad = item;
              return (
                <Card
                  key={actividad.id || index}
                  sx={{
                    bgcolor: actividad.esExtra
                      ? "rgba(255, 243, 224, 0.5)" // Color pastel suave naranja/amarillo para extras
                      : "background.paper", // Color normal para actividades normales
                    borderLeft: actividad.esExtra
                      ? "4px solid rgba(255, 152, 0, 0.3)" // Borde izquierdo sutil para extras
                      : "none",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ fontWeight: "medium", flex: 1 }}
                      >
                        {actividad.job?.nombre || `Job ID: ${actividad.jobId}`}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Stack direction="row" spacing={1}>
                          {/* Horas del chip calculadas dinámicamente según "Hora Corrida" */}
                          <Chip
                            label={`${computeHorasActividadForDisplay(
                              actividad
                            )}h`}
                            size="small"
                            color="primary"
                          />
                          {actividad.esExtra && (
                            <Chip label="Extra" size="small" color="warning" />
                          )}
                        </Stack>
                        <IconButton
                          disabled={disableCreateEditActivities}
                          size="small"
                          onClick={() => handleEditActivity(actividad, index)}
                          sx={{ color: "primary.main" }}
                          title={isIncapacidad ? "No se pueden editar actividades cuando hay incapacidad" : ""}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          disabled={readOnly}
                          size="small"
                          onClick={() => handleDeleteActivity(index)}
                          sx={{ color: "error.main" }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      <strong>Job:</strong>{" "}
                      {actividad.job?.codigo || actividad.jobId}
                    </Typography>

                    {actividad.className && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        <strong>Class:</strong> {actividad.className}
                      </Typography>
                    )}

                    {/* Mostrar horario para actividades extra */}
                    {actividad.esExtra &&
                      actividad.horaInicio &&
                      actividad.horaFin && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          <strong>Horario:</strong>{" "}
                          {formatTimeLocal(actividad.horaInicio)} -{" "}
                          {formatTimeLocal(actividad.horaFin)}
                        </Typography>
                      )}

                    <Typography variant="body1" color="text.primary">
                      {actividad.descripcion}
                    </Typography>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </Stack>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            textAlign: "center",
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 4,
          }}
        >
          <AccessTime sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
          <Typography variant="h6" color="text.primary" gutterBottom>
            No hay actividades para hoy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Comienza agregando tu primera actividad del día
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ borderRadius: 2 }}
            onClick={handleDrawerOpen}
            disabled={disableCreateEditActivities}
            title={isIncapacidad ? "No se pueden agregar actividades cuando hay incapacidad" : ""}
          >
            Agregar Actividad
          </Button>
        </Box>
      )}

      {/* FAB */}
      {isMobile && !initialLoading && (
        <Fab
          variant="extended"
          color="primary"
          aria-label="add"
          onClick={handleDrawerOpen}
          disabled={disableCreateEditActivities}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            textTransform: "none",
          }}
          title={isIncapacidad ? "No se pueden agregar actividades cuando hay incapacidad" : ""}
        >
          <Add sx={{ mr: 1 }} />
          Agregar Actividad
        </Fab>
      )}

      {/* Drawer actividad */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 400 }, maxWidth: "100vw" },
        }}
      >
        <Box
          sx={{
            p: 3,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography variant="h6" component="h2" fontWeight="bold">
              {editingActivity ? "Editar Actividad" : "Nueva Actividad"} - Hoy
            </Typography>
            <IconButton onClick={handleDrawerClose} size="small">
              <Close />
            </IconButton>
          </Box>

          {/* Formulario */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Descripción de la Actividad */}
            <TextField
              disabled={readOnly}
              fullWidth
              required
              multiline
              rows={4}
              name="descripcion"
              label="Descripción de la Actividad"
              placeholder="Describe la actividad realizada..."
              value={formData.descripcion}
              onChange={handleInputChange}
              error={!!formErrors.descripcion}
              helperText={
                formErrors.descripcion ||
                `${formData.descripcion.length}/200 caracteres`
              }
              inputProps={{ maxLength: 200 }}
              sx={{ mb: 3 }}
            />

            {/* Inputs de hora solo se muestran si se marca Hora Extra */}
            {formData.horaExtra && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                  mb: 3,
                }}
              >
                <TextField
                  disabled={readOnly}
                  fullWidth
                  required
                  type="time"
                  name="horaInicio"
                  label="Hora inicio actividad"
                  value={formData.horaInicio}
                  onChange={handleInputChange}
                  onKeyDown={handleTimeKeyDown}
                  error={!!formErrors.horaInicio}
                  helperText={formErrors.horaInicio}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  inputProps={{
                    step: 900, // 15 minutos en segundos
                  }}
                />
                <TextField
                  disabled={readOnly}
                  fullWidth
                  required
                  type="time"
                  name="horaFin"
                  label="Hora fin actividad (00:00 = fin del día)"
                  value={
                    formData.horaFin === "24:00" ? "00:00" : formData.horaFin
                  }
                  onChange={handleInputChange}
                  onKeyDown={handleTimeKeyDown}
                  error={!!formErrors.horaFin}
                  helperText={
                    formErrors.horaFin ||
                    "00:00 representa el final del día (24:00)"
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  inputProps={{
                    step: 900, // 15 minutos en segundos
                  }}
                />
              </Box>
            )}

            {/* Input de horas invertidas */}
            <TextField
              disabled={
                readOnly ||
                formData.horaExtra ||
                horasDisponiblesValidacionForm <= 0
              }
              fullWidth
              required={formData.horaExtra}
              name="horasInvertidas"
              label="Horas Invertidas"
              placeholder={
                formData.horaExtra ? "Calculado automáticamente" : "Ej: 2.5"
              }
              type="number"
              error={!!formErrors.horasInvertidas}
              helperText={
                formErrors.horasInvertidas ||
                (formData.horaExtra
                  ? "Calculado automáticamente desde las horas de inicio y fin"
                  : `Horas restantes: ${Math.max(
                      0,
                      horasDisponiblesValidacionForm
                    ).toFixed(2)}h`)
              }
              InputProps={{
                readOnly: formData.horaExtra,
                endAdornment: formData.horaExtra && (
                  <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Auto
                    </Typography>
                  </Box>
                ),
              }}
              value={formData.horasInvertidas}
              onChange={handleInputChange}
              sx={{ mb: 3 }}
            />

            {/* Job */}
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                options={jobs}
                getOptionLabel={(o) => (o ? `${o.codigo} - ${o.nombre}` : "")}
                value={selectedJob}
                onChange={handleJobChange}
                loading={loadingJobs}
                disabled={loadingJobs || readOnly}
                isOptionEqualToValue={(o, v) =>
                  !!o && !!v ? o.id === v.id : false
                }
                groupBy={(option) =>
                  option?.mostrarEmpresaId && option?.empresa?.nombre
                    ? option.empresa.nombre
                    : "— Especiales —"
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Job"
                    required
                    error={!!formErrors.job}
                    helperText={formErrors.job}
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
                    <Box sx={{ pl: (option?.indentLevel ?? 0) * 4 }}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={
                          option?.mostrarEmpresaId && option?.empresa?.nombre
                            ? "text.primary"
                            : "error.main"
                        }
                      >
                        {option?.codigo} - {option?.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option?.descripcion || "Sin descripción"}
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
                          params.group === "— Especiales —"
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
                      <ul style={{ padding: 0, margin: 0 }}>
                        {params.children}
                      </ul>
                    </Box>
                  </Box>
                )}
                noOptionsText={
                  loadingJobs
                    ? "Cargando jobs..."
                    : "No hay jobs activos disponibles"
                }
              />
            </Box>

            {/* Class (opcional) */}
            <TextField
              disabled={readOnly}
              fullWidth
              name="class"
              label="Class"
              placeholder="Clasificación (opcional)"
              value={formData.class}
              onChange={handleInputChange}
              sx={{ mb: 3 }}
            />

            {/* Hora Extra */}
            <FormControlLabel
              control={
                <Checkbox
                  disabled={
                    readOnly ||
                    (!canAddExtraHours && !forceExtra) ||
                    forceExtra ||
                    shouldForceExtra
                  }
                  name="horaExtra"
                  checked={
                    forceExtra
                      ? true
                      : shouldForceExtra
                      ? isProgressComplete
                        ? true
                        : false
                      : formData.horaExtra
                  }
                  onChange={
                    forceExtra || shouldForceExtra
                      ? undefined
                      : handleInputChange
                  }
                  color="primary"
                />
              }
              label={`Hora Extra (fuera del horario)${
                !canAddExtraHours && !forceExtra
                  ? " - Completa primero las horas normales"
                  : shouldForceExtra && isProgressIncomplete
                  ? " - Completa primero las horas normales del día"
                  : shouldForceExtra && isProgressComplete
                  ? " - Día laboral completo, solo horas extra"
                  : ""
              }`}
              sx={{ mb: 0.5 }}
            />

            {/* Botones */}
            <Box sx={{ mt: "auto", pt: 3 }}>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleDrawerClose}
                  sx={{ py: 1.5 }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  sx={{ py: 1.5 }}
                  disabled={loading}
                >
                  {loading
                    ? "Guardando..."
                    : editingActivity
                    ? "Actualizar"
                    : "Guardar"}
                </Button>
              </Box>

              {/* Mensaje informativo sobre horas extra */}
              {!canAddExtraHours && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, textAlign: "center", fontSize: "0.875rem" }}
                >
                  Completa las horas normales al 100% para poder ingresar horas
                  extra
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyTimesheet;
