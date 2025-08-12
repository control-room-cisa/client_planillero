import * as React from "react";

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
import type { Job } from "../../services/jobService";
import type { RegistroDiarioData } from "../../dtos/RegistrosDiariosDataDto";

interface ActivityData {
  descripcion: string;
  horaInicio: string; // HH:mm
  horaFin: string;    // HH:mm
  horasInvertidas: string;
  job: string;
  class: string;
  horaExtra: boolean;
}

interface Activity {
  id?: number;
  descripcion: string;
  horaInicio?: string; // ISO
  horaFin?: string;    // ISO
  duracionHoras: number;
  jobId: number;
  className?: string | null;
  esExtra: boolean;
  job?: {
    nombre: string;
    codigo: string;
  };
}

const DailyTimesheet: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<Activity | null>(null);
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
  const [formErrors, setFormErrors] = React.useState<{ [key: string]: string }>({});

  // Jobs
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);

  // Registro diario
  const [registroDiario, setRegistroDiario] = React.useState<RegistroDiarioData | null>(null);
  const [dayConfigData, setDayConfigData] = React.useState({
    horaEntrada: "",
    horaSalida: "",
    jornada: "D",
    esDiaLibre: false,
    esHoraCorrida: false,
    comentarioEmpleado: "",
  });
  const [dayConfigErrors, setDayConfigErrors] = React.useState<{ [key: string]: string }>({});
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // ===== Helpers de tiempo =====
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const getDayBoundsMinutes = () => {
    const entradaHHMM =
      registroDiario?.horaEntrada?.substring(11, 16) || dayConfigData.horaEntrada;
    const salidaHHMM =
      registroDiario?.horaSalida?.substring(11, 16) || dayConfigData.horaSalida;

    const dayStart = timeToMinutes(entradaHHMM);
    let dayEnd = timeToMinutes(salidaHHMM);
    const crossesMidnight = dayEnd <= dayStart; // ejemplo: 07:00 → 01:00

    if (crossesMidnight) dayEnd += 1440;
    return { dayStart, dayEnd, entradaHHMM, salidaHHMM, crossesMidnight };
  };

  const normalizeToDaySpan = (t: number, dayStart: number, crossesMidnight: boolean) =>
    crossesMidnight && t < dayStart ? t + 1440 : t;

  const intervalOverlap = (a1: number, a2: number, b1: number, b2: number) =>
    Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

  const lunchOverlapInRange = (dayStart: number, dayEnd: number) => {
    // Almuerzo fijo 12:00–13:00
    const L1 = 720;
    const L2 = 780;
    return intervalOverlap(dayStart, dayEnd, L1, L2);
  };

  const buildISO = (baseDate: Date, hhmm: string, addDays = 0) => {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + addDays);
    const [h, m] = hhmm.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    // Forzamos a Zulu
    return new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), 0, 0)
    ).toISOString();
  };

  // ===== Helpers de validación/cálculo =====

  // Devuelve error si la hora dada está fuera del rango del día (texto fijo pedido)
  const errorOutsideRange = (which: "inicio" | "fin", hhmm: string): string => {
    if (!hhmm) return "";
    const { dayStart, dayEnd, crossesMidnight } = getDayBoundsMinutes();
    if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd)) return "";

    const t = normalizeToDaySpan(timeToMinutes(hhmm), dayStart, crossesMidnight);
    if (t < dayStart || t > dayEnd) {
      return which === "inicio"
        ? "La hora de inicio está fuera del horario laboral"
        : "La hora de fin está fuera del horario laboral";
    }
    return "";
  };

  // Valida Hora fin: primero rango; luego relación con inicio si el día NO cruza medianoche
  const computeHoraFinError = (fin: string, inicio: string): string => {
    const rangoErr = errorOutsideRange("fin", fin);
    if (rangoErr) return rangoErr;
    if (!fin || !inicio) return "";

    const { crossesMidnight } = getDayBoundsMinutes();
    const s = timeToMinutes(inicio);
    const e = timeToMinutes(fin);
    if (!crossesMidnight && e <= s) return "La hora final debe ser posterior a la inicial";
    return "";
  };

  // Calcula HH con o sin descuento de almuerzo (12:00–13:00) según esHoraCorrida
  const computeHorasInvertidas = (inicioHHMM: string, finHHMM: string): string => {
    if (!inicioHHMM || !finHHMM) return "";

    // Duración base
    const [h1, m1] = inicioHHMM.split(":").map(Number);
    const [h2, m2] = finHHMM.split(":").map(Number);
    let dur = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (dur < 0) dur += 24; // cruza medianoche

    // Si NO es hora corrida, restar solape con almuerzo 12:00–13:00
    if (!dayConfigData.esHoraCorrida) {
      const { dayStart, crossesMidnight } = getDayBoundsMinutes();
      let s = normalizeToDaySpan(timeToMinutes(inicioHHMM), dayStart, crossesMidnight);
      let e = normalizeToDaySpan(timeToMinutes(finHHMM), dayStart, crossesMidnight);
      if (e <= s) e += 1440;

      const L1 = 720; // 12:00
      const L2 = 780; // 13:00
      const overlapMin = intervalOverlap(s, e, L1, L2);
      dur = Math.max(0, dur - overlapMin / 60);
    }

    return dur.toFixed(2);
  };

  // === NUEVO: helpers para mostrar/sumar horas por actividad (chips & progreso) ===
  const formatHours = (h: number) =>
    String(Math.round(h * 100) / 100).replace(/\.0+$/, "");

  const computeHorasActividadForDisplayNum = (act: Activity): number => {
    if (!act.horaInicio || !act.horaFin) return 0;

    const { dayStart, crossesMidnight } = getDayBoundsMinutes();

    const sHM = act.horaInicio.substring(11, 16); // HH:mm
    const eHM = act.horaFin.substring(11, 16);    // HH:mm

    let s = normalizeToDaySpan(timeToMinutes(sHM), dayStart, crossesMidnight);
    let e = normalizeToDaySpan(timeToMinutes(eHM), dayStart, crossesMidnight);
    if (e <= s) e += 1440; // cruza medianoche

    // Duración base
    let hours = (e - s) / 60;

    // Si NO es hora corrida, descontar solape con almuerzo 12:00–13:00
    if (!dayConfigData.esHoraCorrida) {
      const L1 = 720; // 12:00
      const L2 = 780; // 13:00
      const overlapMin = intervalOverlap(s, e, L1, L2);
      hours = Math.max(0, hours - overlapMin / 60);
    }

    return Math.round(hours * 100) / 100;
  };

  const computeHorasActividadForDisplay = (act: Activity): string =>
    formatHours(computeHorasActividadForDisplayNum(act));

  // === NUEVO: helpers para validar actividades vs. nuevo rango del día ===
  const getBoundsFromHHMM = (entrada: string, salida: string) => {
    const start = timeToMinutes(entrada);
    let end = timeToMinutes(salida);
    const crossesMidnight = end <= start;
    if (crossesMidnight) end += 1440;
    return { dayStart: start, dayEnd: end, crossesMidnight };
  };

  const isActivityOutsideRange = (
    act: Activity,
    dayStart: number,
    dayEnd: number,
    crossesMidnight: boolean
  ) => {
    if (!act.horaInicio || !act.horaFin) return false;
    const sHM = act.horaInicio.substring(11, 16);
    const eHM = act.horaFin.substring(11, 16);

    let s = normalizeToDaySpan(timeToMinutes(sHM), dayStart, crossesMidnight);
    let e = normalizeToDaySpan(timeToMinutes(eHM), dayStart, crossesMidnight);
    if (e <= s) e += 1440;

    return s < dayStart || e > dayEnd;
  };

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
      setJobs(jobsData.filter((j) => j.activo === true));
    } catch (e) {
      console.error("Error al cargar jobs:", e);
      setSnackbar({ open: true, message: "Error al cargar la lista de jobs", severity: "error" });
    } finally {
      setLoadingJobs(false);
    }
  };

  const readOnly = !!(registroDiario?.aprobacionSupervisor || registroDiario?.aprobacionRrhh);

  const loadRegistroDiario = async () => {
    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split("T")[0];
      const registro = await RegistroDiarioService.getByDate(dateString);
      setRegistroDiario(registro);

      if (registro) {
        const horaEntrada = registro.horaEntrada.substring(11, 16);
        const horaSalida = registro.horaSalida.substring(11, 16);
        setDayConfigData({
          horaEntrada,
          horaSalida,
          jornada: registro.jornada || "M",
          esDiaLibre: registro.esDiaLibre || false,
          esHoraCorrida: registro.esHoraCorrida || false,
          comentarioEmpleado: registro.comentarioEmpleado || "",
        });
      } else {
        // Resetear el formulario si no hay datos
        setDayConfigData({
          horaEntrada: "07:00",
          horaSalida: "17:00",
          jornada: "M",
          esDiaLibre: false,
          esHoraCorrida: false,
          comentarioEmpleado: "",
        });
      }
    } catch (e) {
      console.error("Error al cargar registro diario:", e);
      setSnackbar({ open: true, message: "Error al cargar los datos del día", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ===== Drawer =====
  const handleDrawerOpen = async () => {
    setDrawerOpen(true);
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
    const inicio = activity.horaInicio ? activity.horaInicio.substring(11, 16) : "";
    const fin = activity.horaFin ? activity.horaFin.substring(11, 16) : "";
    setFormData({
      descripcion: activity.descripcion || "",
      horaInicio: inicio,
      horaFin: fin,
      horasInvertidas: activity.duracionHoras?.toString() || "",
      job: activity.jobId?.toString() || "",
      class: activity.className || "",
      horaExtra: activity.esExtra || false,
    });
    setDrawerOpen(true);
    await loadJobs();
  };

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
      const dateString = currentDate.toISOString().split("T")[0];

      const actividadesActualizadas =
        registroDiario.actividades
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
        esHoraCorrida: registroDiario.esHoraCorrida,
        comentarioEmpleado: registroDiario.comentarioEmpleado,
        actividades: actividadesActualizadas,
      };

      const updatedRegistro = await RegistroDiarioService.upsert(params);
      setRegistroDiario(updatedRegistro);
      setSnackbar({ open: true, message: "Actividad eliminada correctamente", severity: "success" });
    } catch (e) {
      console.error("Error al eliminar actividad:", e);
      setSnackbar({ open: true, message: "Error al eliminar la actividad", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ===== Config del día =====
  const handleDayConfigInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setDayConfigData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (dayConfigErrors[name]) setDayConfigErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateDayConfig = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!dayConfigData.horaEntrada) errors.horaEntrada = "La hora de entrada es obligatoria";
    if (!dayConfigData.horaSalida) errors.horaSalida = "La hora de salida es obligatoria";
    setDayConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const hasChangesInDayConfig = (): boolean => {
    if (!registroDiario) return false;

    // Extraer solo la hora de la fecha ISO sin conversión de zona horaria
    const registroHoraEntrada = registroDiario.horaEntrada.substring(11, 16);
    const registroHoraSalida = registroDiario.horaSalida.substring(11, 16);

    return (
      dayConfigData.horaEntrada !== registroHoraEntrada ||
      dayConfigData.horaSalida !== registroHoraSalida ||
      dayConfigData.jornada !== registroDiario.jornada ||
      dayConfigData.esDiaLibre !== registroDiario.esDiaLibre ||
      dayConfigData.esHoraCorrida !== registroDiario.esHoraCorrida ||
      dayConfigData.comentarioEmpleado !== (registroDiario.comentarioEmpleado || "")
    );
  };

  const handleDayConfigSubmit = async () => {
    if (!validateDayConfig()) return;

    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split("T")[0];
      const horaEntradaISO = buildISO(currentDate, dayConfigData.horaEntrada, 0);
      // decidir si horaSalida es al día siguiente
      const startM = timeToMinutes(dayConfigData.horaEntrada);
      const endM = timeToMinutes(dayConfigData.horaSalida);
      const addDayForEnd = endM <= startM ? 1 : 0;
      const horaSalidaISO = buildISO(currentDate, dayConfigData.horaSalida, addDayForEnd);

      // === NUEVO: Validación de actividades vs. NUEVO rango del día ===
      {
        const { dayStart: newStart, dayEnd: newEnd, crossesMidnight: newCross } =
          getBoundsFromHHMM(dayConfigData.horaEntrada, dayConfigData.horaSalida);

        const acts = registroDiario?.actividades || [];
        const outOfRange = acts
          .map((act, idx) => ({
            idx,
            act,
            outside: isActivityOutsideRange(act, newStart, newEnd, newCross),
          }))
          .filter(x => x.outside);

        if (outOfRange.length > 0) {
          const rango = `${dayConfigData.horaEntrada} - ${dayConfigData.horaSalida}`;
          outOfRange.slice(0, 3).map(x => {
            const from = x.act.horaInicio?.substring(11, 16) || "??:??";
            const to = x.act.horaFin?.substring(11, 16) || "??:??";
            const job = x.act.job?.codigo || x.act.jobId;
            return `• Act ${x.idx + 1} (${job}) ${from}-${to}`;
          }).join("  ");

          setSnackbar({
            open: true,
            severity: "error",
            message:
              `Hay ${outOfRange.length} actividad fuera del nuevo rango (${rango}).
               ${" "} debes actualizar actividad
              `
          });
          setLoading(false);
          return; // BLOQUEA el guardado del día
        }
      }

      const params = {
        fecha: dateString,
        horaEntrada: horaEntradaISO,
        horaSalida: horaSalidaISO,
        jornada: dayConfigData.jornada,
        esDiaLibre: dayConfigData.esDiaLibre,
        esHoraCorrida: dayConfigData.esHoraCorrida,
        comentarioEmpleado: dayConfigData.comentarioEmpleado,
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
      setSnackbar({ open: true, message: "Configuración del día guardada correctamente", severity: "success" });
    } catch (e) {
      console.error("Error al guardar configuración del día:", e);
      setSnackbar({ open: true, message: "Error al guardar la configuración", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ===== Form actividad =====
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };

      // Recalcular horas invertidas cuando cambian inicio/fin (con lógica de almuerzo/hora corrida)
      if (name === "horaInicio" || name === "horaFin") {
        const v = computeHorasInvertidas(next.horaInicio, next.horaFin);
        next.horasInvertidas = v;
      }

      // === Validación en vivo SOLO para horas ===
      if (name === "horaInicio") {
        const errInicio = errorOutsideRange("inicio", next.horaInicio);
        const errFin = computeHoraFinError(next.horaFin, next.horaInicio); // revalida fin
        setFormErrors((prevE) => ({ ...prevE, horaInicio: errInicio, horaFin: errFin }));
      } else if (name === "horaFin") {
        const errFin = computeHoraFinError(next.horaFin, next.horaInicio);
        setFormErrors((prevE) => ({ ...prevE, horaFin: errFin }));
      }

      return next;
    });
  };

  const handleJobChange = (_e: React.SyntheticEvent, value: Job | null) => {
    setSelectedJob(value);
    setFormData((prev) => ({ ...prev, job: value ? value.id.toString() : "" }));
    if (formErrors.job) setFormErrors((prev) => ({ ...prev, job: "" }));
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    const { horaInicio, horaFin } = formData;

    if (!formData.descripcion.trim()) errors.descripcion = "La descripción es obligatoria";
    if (!horaInicio) errors.horaInicio = "Hora inicio obligatoria";
    if (!horaFin) errors.horaFin = "Hora fin obligatoria";
    if (!formData.job.trim()) errors.job = "El job es obligatorio";

    // Horas invertidas (calcular para asegurar consistencia)
    const horasCalc = computeHorasInvertidas(horaInicio, horaFin);
    if (!horasCalc) {
      errors.horasInvertidas = "Las horas invertidas son obligatorias";
    } else {
      const hours = parseFloat(horasCalc);
      if (isNaN(hours) || hours <= 0) errors.horasInvertidas = "Ingresa un número válido mayor a 0";
    }

    if (!horaInicio || !horaFin) {
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }

    // Rango y relación inicio/fin
    const { dayStart, dayEnd, crossesMidnight } = getDayBoundsMinutes();
    const s = normalizeToDaySpan(timeToMinutes(horaInicio), dayStart, crossesMidnight);
    const e = normalizeToDaySpan(timeToMinutes(horaFin), dayStart, crossesMidnight);

    if (s < dayStart || s > dayEnd) {
      errors.horaInicio = "La hora de inicio está fuera del horario laboral";
    }
    if (e < dayStart || e > dayEnd) {
      errors.horaFin = "La hora de fin está fuera del horario laboral";
    }
    if (!crossesMidnight && timeToMinutes(horaFin) <= timeToMinutes(horaInicio)) {
      errors.horaFin = "La hora final debe ser posterior a la inicial";
    }

    // === Validación: no solaparse con otras actividades ===
    if (registroDiario?.actividades && registroDiario.actividades.length > 0) {
      let newS = s;
      let newE = e;
      if (newE <= newS) newE += 1440;

      const overlaps = registroDiario.actividades.some((act, idx) => {
        if (editingActivity && idx === editingIndex) return false;
        if (!act.horaInicio || !act.horaFin) return false;

        const sHM = act.horaInicio.substring(11, 16);
        const eHM = act.horaFin.substring(11, 16);
        let s2 = normalizeToDaySpan(timeToMinutes(sHM), dayStart, crossesMidnight);
        let e2 = normalizeToDaySpan(timeToMinutes(eHM), dayStart, crossesMidnight);
        if (e2 <= s2) e2 += 1440;

        return newS < e2 && s2 < newE;
      });

      if (overlaps) {
        errors.horaInicio = "Este horario se solapa con otra actividad";
        errors.horaFin = "Este horario se solapa con otra actividad";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split("T")[0];

      // Construir ISO para inicio/fin (si el fin es <= inicio, poner fin al DÍA SIGUIENTE)
      const startM = timeToMinutes(formData.horaInicio);
      const endM = timeToMinutes(formData.horaFin);
      const addDay = endM <= startM ? 1 : 0;

      const actividad = {
        jobId: parseInt(formData.job),
        duracionHoras: parseFloat(computeHorasInvertidas(formData.horaInicio, formData.horaFin)),
        esExtra: formData.horaExtra,
        className: formData.class || undefined,
        descripcion: formData.descripcion,
        horaInicio: buildISO(currentDate, formData.horaInicio, 0),
        horaFin: buildISO(currentDate, formData.horaFin, addDay),
      };

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

        const params = {
          fecha: dateString,
          horaEntrada: registroDiario.horaEntrada,
          horaSalida: registroDiario.horaSalida,
          jornada: registroDiario.jornada,
          esDiaLibre: registroDiario.esDiaLibre,
          esHoraCorrida: registroDiario.esHoraCorrida,
          comentarioEmpleado: registroDiario.comentarioEmpleado,
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

        const params = {
          fecha: dateString,
          horaEntrada: buildISO(currentDate, dayConfigData.horaEntrada, 0),
          horaSalida: buildISO(currentDate, dayConfigData.horaSalida, addDayForEnd),
          jornada: dayConfigData.jornada,
          esDiaLibre: dayConfigData.esDiaLibre,
          esHoraCorrida: dayConfigData.esHoraCorrida,
          comentarioEmpleado: dayConfigData.comentarioEmpleado,
          actividades: [actividad],
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      }

      const actionMessage = editingActivity ? "Actividad actualizada correctamente" : "Actividad guardada correctamente";
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
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + (direction === "prev" ? -1 : 1));
    setCurrentDate(d);
  };
  const goToToday = () => setCurrentDate(new Date());
  const isToday = () => currentDate.toDateString() === new Date().toDateString();

  // ===== Horas trabajadas / Totales & progreso =====
  const { dayStart, dayEnd } = getDayBoundsMinutes();
  let totalHours = (dayEnd - dayStart) / 60;

  // Descontar almuerzo 12:00–13:00 si NO es hora corrida (total teórico del día)
  if (!dayConfigData.esHoraCorrida) {
    const lunchDayOverlap = lunchOverlapInRange(dayStart, dayEnd) / 60;
    totalHours = Math.max(0, totalHours - lunchDayOverlap);
  }

  // SUMA real trabajada usando la misma lógica que los chips (consistente con "Hora Corrida")
  const workedHours =
    registroDiario?.actividades?.reduce((acc, act) => acc + computeHorasActividadForDisplayNum(act), 0) || 0;

  const progressPercentage =
    totalHours > 0 ? Math.min(100, Math.max(0, (workedHours / totalHours) * 100)) : 0;

  // Estado del registro diario
  const hasDayRecord = Boolean(registroDiario);
  const dayConfigHasChanges = hasChangesInDayConfig();

  // Recalcular horasInvertidas cuando cambia hora corrida / entrada / salida
  React.useEffect(() => {
    setFormData(prev => {
      if (!prev.horaInicio || !prev.horaFin) return prev;
      const v = computeHorasInvertidas(prev.horaInicio, prev.horaFin);
      return v === prev.horasInvertidas ? prev : { ...prev, horasInvertidas: v };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayConfigData.esHoraCorrida, dayConfigData.horaEntrada, dayConfigData.horaSalida]);

  // Recalcular horasInvertidas cuando cambian los campos de tiempo del formulario
  React.useEffect(() => {
    const { horaInicio, horaFin } = formData;
    if (horaInicio && horaFin) {
      const v = computeHorasInvertidas(horaInicio, horaFin);
      setFormData((prev) => ({ ...prev, horasInvertidas: v }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.horaInicio, formData.horaFin]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: "100%" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h5"} component="h1" sx={{ fontWeight: "bold", minWidth: 0 }}>
          Registro de Actividades
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <IconButton onClick={() => navigateDate("prev")} size="small"><ChevronLeft /></IconButton>
          <Button variant={isToday() ? "contained" : "outlined"} startIcon={<CalendarToday />} onClick={goToToday} size="small" sx={{ minWidth: "auto" }}>
            {isToday() ? "Hoy" : "Hoy"}
          </Button>
          <IconButton onClick={() => navigateDate("next")} size="small"><ChevronRight /></IconButton>
          <Button
            variant={hasDayRecord ? "outlined" : "contained"}
            startIcon={<Settings />}
            onClick={handleDayConfigSubmit}
            size="small"
            color={hasDayRecord ? "success" : "primary"}
            sx={{ ml: 1 }}
            disabled={loading || (hasDayRecord && !dayConfigHasChanges)}
          >
            {loading ? "Guardando..." : hasDayRecord ? "Actualizar Día" : "Guardar Día"}
          </Button>
        </Box>
      </Box>

      {/* Fecha actual */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, textAlign: "center" }}>
        {formatDate(currentDate)}
      </Typography>

      {/* Info del día */}
      {registroDiario && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
          <Chip
            label={`Jornada: ${registroDiario.jornada === "D" ? "Dia" : registroDiario.jornada === "N" ? "Noche" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${registroDiario.horaEntrada.substring(11, 16)} - ${registroDiario.horaSalida.substring(11, 16)}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          {registroDiario.esDiaLibre && <Chip label="Día Libre" size="small" color="warning" variant="outlined" />}
          {registroDiario.esHoraCorrida && <Chip label="Hora Corrida" size="small" color="warning" variant="outlined" />}
        </Stack>
      )}

      {/* Saludo */}
      <Typography variant="body2" color="text.primary" sx={{ mb: 3, textAlign: "center", fontWeight: "medium" }}>
        ¡Buen día, {user?.nombre}! 👋
      </Typography>

      {/* Configuración del día */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: "bold" }}>
            Configuración del Día Laboral
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
            <TextField
              disabled={readOnly}
              fullWidth
              required
              type="time"
              name="horaEntrada"
              label="Hora de Entrada"
              value={dayConfigData.horaEntrada}
              onChange={handleDayConfigInputChange}
              error={!!dayConfigErrors.horaEntrada}
              helperText={dayConfigErrors.horaEntrada}
              InputLabelProps={{ shrink: true }}
              size="small"
            />

            {/* Hora de Salida */}
            <TextField
              disabled={readOnly}
              fullWidth
              required
              type="time"
              name="horaSalida"
              label="Hora de Salida"
              value={dayConfigData.horaSalida}
              onChange={handleDayConfigInputChange}
              error={!!dayConfigErrors.horaSalida}
              helperText={dayConfigErrors.horaSalida}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Jornada</InputLabel>
              <Select
                disabled={readOnly}
                name="jornada"
                value={dayConfigData.jornada}
                onChange={(e) => handleDayConfigInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                label="Jornada"
              >
                <MenuItem value="D">Día</MenuItem>
                <MenuItem value="N">Noche</MenuItem>
              </Select>
            </FormControl>

            {/* Es Día Libre */}
            <Box sx={{ display: "flex", alignItems: "center", height: "40px" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={readOnly}
                    name="esDiaLibre"
                    checked={dayConfigData.esDiaLibre}
                    onChange={handleDayConfigInputChange}
                    color="primary"
                  />
                }
                label="Día Libre"
              />
            </Box>
            {/* Es Hora Corrida */}
            <Box sx={{ display: "flex", alignItems: "center", height: "40px" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={readOnly}
                    name="esHoraCorrida"
                    checked={dayConfigData.esHoraCorrida}
                    onChange={handleDayConfigInputChange}
                    color="primary"
                  />
                }
                label="Hora Corrida"
              />
            </Box>
          </Box>

          {/* Comentario del Colaborador */}
          <TextField
            disabled={readOnly}
            fullWidth
            multiline
            rows={2}
            name="comentarioEmpleado"
            label="Comentario (opcional)"
            placeholder="Agregar comentarios adicionales..."
            value={dayConfigData.comentarioEmpleado}
            onChange={handleDayConfigInputChange}
            size="small"
          />
        </CardContent>
      </Card>

      {/* Progreso */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <AccessTime sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" component="h2">Progreso del Día Laboral</Typography>
            <Box sx={{ ml: "auto" }}>
              <Typography variant="body2" color="primary.main" fontWeight="bold">
                {workedHours.toFixed(1)} / {totalHours.toFixed(1)} horas
              </Typography>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 2,
              bgcolor: "grey.200",
              "& .MuiLinearProgress-bar": { borderRadius: 4 },
            }}
          />

          <Typography variant="body2" color="warning.main">
            Faltan {Math.max(0, totalHours - workedHours).toFixed(1)} horas para completar el día
          </Typography>
        </CardContent>
      </Card>

      {/* Lista de actividades */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" component="h2">Actividades de Hoy</Typography>
        {!isMobile && (
          <Button disabled={readOnly} variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }} onClick={handleDrawerOpen}>
            Nueva Actividad
          </Button>
        )}
      </Box>

      {/* Activities list or empty state */}
      {registroDiario?.actividades && registroDiario.actividades.length > 0 ? (
        <Stack spacing={2}>
          {registroDiario.actividades.map((actividad, index) => (
            <Card key={actividad.id || index} sx={{ bgcolor: "background.paper" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: "medium", flex: 1 }}>
                    {actividad.job?.nombre || `Job ID: ${actividad.jobId}`}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Stack direction="row" spacing={1}>
                      {/* Horas del chip calculadas dinámicamente según "Hora Corrida" */}
                      <Chip label={`${computeHorasActividadForDisplay(actividad)}h`} size="small" color="primary" />
                      {actividad.esExtra && <Chip label="Extra" size="small" color="warning" />}
                    </Stack>
                    <IconButton disabled={readOnly} size="small" onClick={() => handleEditActivity(actividad, index)} sx={{ color: "primary.main" }}>
                      <Edit />
                    </IconButton>
                    <IconButton disabled={readOnly} size="small" onClick={() => handleDeleteActivity(index)} sx={{ color: "error.main" }}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Job:</strong> {actividad.job?.codigo || actividad.jobId}
                </Typography>

                {actividad.className && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Class:</strong> {actividad.className}
                  </Typography>
                )}

                <Typography variant="body1" color="text.primary">{actividad.descripcion}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, textAlign: "center", bgcolor: "background.paper", borderRadius: 2, p: 4 }}>
          <AccessTime sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
          <Typography variant="h6" color="text.primary" gutterBottom>No hay actividades para hoy</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Comienza agregando tu primera actividad del día</Typography>
          <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }} onClick={handleDrawerOpen}>
            Agregar Actividad
          </Button>
        </Box>
      )}

      {/* FAB */}
      {isMobile && (
        <Fab variant="extended" color="primary" aria-label="add" onClick={handleDrawerOpen} sx={{ position: "fixed", bottom: 16, right: 16, textTransform: "none" }}>
          <Add sx={{ mr: 1 }} />
          Agregar Actividad
        </Fab>
      )}

      {/* Drawer actividad */}
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose} PaperProps={{ sx: { width: { xs: "100%", sm: 400 }, maxWidth: "100vw" } }}>
        <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h6" component="h2" fontWeight="bold">
              {editingActivity ? "Editar Actividad" : "Nueva Actividad"} - Hoy
            </Typography>
            <IconButton onClick={handleDrawerClose} size="small"><Close /></IconButton>
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
              helperText={formErrors.descripcion}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
              <TextField
                disabled={readOnly}
                fullWidth
                required
                type="time"
                name="horaInicio"
                label="Hora inicio actividad"
                value={formData.horaInicio}
                onChange={handleInputChange}
                error={!!formErrors.horaInicio}
                helperText={formErrors.horaInicio}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                disabled={readOnly}
                fullWidth
                required
                type="time"
                name="horaFin"
                label="Hora fin actividad"
                value={formData.horaFin}
                onChange={handleInputChange}
                error={!!formErrors.horaFin}
                helperText={formErrors.horaFin}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Box>

            <TextField
              disabled
              fullWidth
              required
              name="horasInvertidas"
              label="Horas Invertidas"
              placeholder="Ej: 2.5"
              type="number"
              InputProps={{ readOnly: true }}
              value={formData.horasInvertidas}
              sx={{ mb: 3 }}
            />

            {/* Job */}
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                options={jobs}
                getOptionLabel={(o) => `${o.codigo} - ${o.nombre}`}
                value={selectedJob}
                onChange={handleJobChange}
                loading={loadingJobs}
                disabled={loadingJobs || readOnly}
                isOptionEqualToValue={(o, v) => o.id === v.id}
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
                          {loadingJobs ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {option.codigo} - {option.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.empresa.nombre}
                      </Typography>
                    </Box>
                  </Box>
                )}
                noOptionsText={loadingJobs ? "Cargando jobs..." : "No hay jobs activos disponibles"}
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
                  disabled={readOnly}
                  name="horaExtra"
                  checked={formData.horaExtra}
                  onChange={handleInputChange}
                  color="primary"
                />
              }
              label="Hora Extra (fuera del horario 7AM - 5PM)"
              sx={{ mb: 3 }}
            />

            {/* Botones */}
            <Box sx={{ mt: "auto", pt: 3 }}>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button variant="outlined" fullWidth onClick={handleDrawerClose} sx={{ py: 1.5 }}>
                  Cancelar
                </Button>
                <Button variant="contained" fullWidth onClick={handleSubmit} sx={{ py: 1.5 }} disabled={loading}>
                  {loading ? "Guardando..." : editingActivity ? "Actualizar" : "Guardar"}
                </Button>
              </Box>
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
        <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyTimesheet;
