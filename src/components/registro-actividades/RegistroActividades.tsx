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
import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import { HorarioValidator } from "../../utils/horarioValidations";

import type { Job } from "../../services/jobService";
import type { RegistroDiarioData } from "../../dtos/RegistrosDiariosDataDto";
import type {
  Activity,
  ActivityData,
  DayConfigData,
  FormErrors,
  HorarioValidado,
  SnackbarState,
} from "./types";

import {
  timeToMinutes,
  buildISO,
  getBoundsFromHHMM,
  normalizeToDaySpan,
  lunchOverlapInRange,
  errorOutsideRange,
  computeHoraFinError,
  computeHorasInvertidas,
  computeHorasActividadForDisplayNum,
  computeHorasActividadForDisplay,
  isActivityOutsideRange,
} from "./utils-time";

// CHANGED: helper para forzar solo "D" o "N"
const sanitizeJornada = (v: unknown): "D" | "N" => (v === "N" ? "N" : "D");

export default function RegistroActividades() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();

  // Fecha actual
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Drawer y edición
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<Activity | null>(
    null
  );
  const [editingIndex, setEditingIndex] = React.useState<number>(-1);

  // Form drawer
  const [formData, setFormData] = React.useState<ActivityData>({
    descripcion: "",
    horaInicio: "",
    horaFin: "",
    horasInvertidas: "",
    job: "",
    class: "",
    horaExtra: false,
  });
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});

  // Jobs
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);

  // Registro diario
  const [registroDiario, setRegistroDiario] =
    React.useState<RegistroDiarioData | null>(null);

  const [dayConfigData, setDayConfigData] = React.useState<DayConfigData>({
    horaEntrada: "",
    horaSalida: "",
    jornada: "D", // CHANGED: default solo D/N
    esDiaLibre: false,
    esHoraCorrida: false,
    comentarioEmpleado: "",
  });
  const [dayConfigErrors, setDayConfigErrors] = React.useState<FormErrors>({});

  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const [horarioValidado, setHorarioValidado] =
    React.useState<HorarioValidado | null>(null);

  // ======= Carga inicial por fecha =======
  React.useEffect(() => {
    loadRegistroDiario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const loadRegistroDiario = async () => {
    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split("T")[0];
      const registro = await RegistroDiarioService.getByDate(dateString);
      setRegistroDiario(registro);

      // Validaciones de horario (también obtenemos el tipo de horario)
      const tipoHorario = await loadHorarioValidations(dateString, registro);

      if (registro) {
        const horaEntrada = registro.horaEntrada.substring(11, 16);
        const horaSalida = registro.horaSalida.substring(11, 16);
        setDayConfigData({
          horaEntrada,
          horaSalida,
          jornada: sanitizeJornada(registro.jornada as string), // CHANGED
          esDiaLibre: registro.esDiaLibre || false,
          esHoraCorrida: registro.esHoraCorrida || false,
          comentarioEmpleado: registro.comentarioEmpleado || "",
        });
      } else {
        // No hay registro en BD para ese día
        // Para H2 usamos los valores calculados por la API (establecidos en loadHorarioValidations)
        // Para H1 y subtipos mantenemos el comportamiento actual (defaults estáticos)
        if (tipoHorario !== "H2") {
          setDayConfigData({
            horaEntrada: "07:00",
            horaSalida: "17:00",
            jornada: "D", // CHANGED: nunca "M"
            esDiaLibre: false,
            esHoraCorrida: false,
            comentarioEmpleado: "",
          });
        }
      }
    } catch (e) {
      console.error("Error al cargar registro diario:", e);
      setSnackbar({
        open: true,
        message: "Error al cargar los datos del día",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHorarioValidations = async (
    fecha: string,
    registro: RegistroDiarioData | null
  ): Promise<string | undefined> => {
    try {
      if (!user?.id) return undefined;
      const horarioData =
        await CalculoHorasTrabajoService.getHorasNormalesTrabajo(
          user.id,
          fecha
        );

      const datosExistentes = Boolean(registro);
      const tipoHorario = horarioData.horarioTrabajo.tipoHorario as
        | string
        | undefined;
      const validacion = HorarioValidator.validateByTipo(
        tipoHorario || "",
        horarioData.horarioTrabajo,
        datosExistentes
      );
      setHorarioValidado(validacion);

      // Auto-config si no hay datos en BD
      if (!datosExistentes && validacion) {
        setDayConfigData((prev) => ({
          ...prev,
          horaEntrada: validacion.horaInicio,
          horaSalida: validacion.horaFin,
          esDiaLibre: validacion.esDiaLibre,
          // Quitar forzado: no marcar Hora Corrida automático para H2
          esHoraCorrida: prev.esHoraCorrida,
        }));
      }

      return tipoHorario;
    } catch (error) {
      console.error("Error al cargar validaciones de horario:", error);
      return undefined;
    }
  };

  // ======= Jobs (autocomplete) =======
  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const jobsData = await JobService.getAll();
      const jobsActivos = jobsData.filter((j) => j.activo === true);
      const jobsFiltrados = formData.horaExtra
        ? jobsActivos.filter((j) => !j.especial)
        : jobsActivos;
      setJobs(jobsFiltrados);

      // Si estamos en hora extra, asegurar que no quede seleccionado un job especial
      if (
        formData.horaExtra &&
        (selectedJob?.especial ||
          (formData.job &&
            jobsFiltrados.every((job) => job.id.toString() !== formData.job)))
      ) {
        setSelectedJob(null);
        setFormData((prev) => ({ ...prev, job: "" }));
      }
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

  // ======== Helpers para cabecera ========
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
    setCurrentDate(d);
  };
  const goToToday = () => setCurrentDate(new Date());
  const isToday = () =>
    currentDate.toDateString() === new Date().toDateString();

  // ======== Rango del día / progreso ========
  const entradaHHMM =
    registroDiario?.horaEntrada?.substring(11, 16) || dayConfigData.horaEntrada;
  const salidaHHMM =
    registroDiario?.horaSalida?.substring(11, 16) || dayConfigData.horaSalida;

  const { dayStart, dayEnd } = getBoundsFromHHMM(entradaHHMM, salidaHHMM);
  let totalHours = (dayEnd - dayStart) / 60;

  if (!dayConfigData.esHoraCorrida) {
    const lunchDayOverlap = lunchOverlapInRange(dayStart, dayEnd) / 60;
    totalHours = Math.max(0, totalHours - lunchDayOverlap);
  }

  const workedHours =
    registroDiario?.actividades?.reduce((acc, act) => {
      // Para horas normales (sin horaInicio/horaFin), usar directamente duracionHoras
      if (!act.horaInicio || !act.horaFin) {
        return acc + (act.duracionHoras || 0);
      }
      // Para hora extra (con horaInicio/horaFin), calcular las horas
      return (
        acc +
        computeHorasActividadForDisplayNum(
          act as unknown as Activity,
          dayConfigData.esHoraCorrida,
          entradaHHMM,
          salidaHHMM
        )
      );
    }, 0) || 0;

  const editingHoursNormales =
    editingActivity && !editingActivity.esExtra
      ? (() => {
          if (!editingActivity.horaInicio || !editingActivity.horaFin) {
            return editingActivity.duracionHoras || 0;
          }
          return computeHorasActividadForDisplayNum(
            editingActivity as unknown as Activity,
            dayConfigData.esHoraCorrida,
            entradaHHMM,
            salidaHHMM
          );
        })()
      : 0;

  const horasNormales = horarioValidado?.horasNormales || totalHours;
  const horasDisponiblesReales = Math.max(0, horasNormales - workedHours);
  const progressPercentage = HorarioValidator.getProgressPercentage(
    workedHours,
    horasNormales
  );
  const horasFaltantesMessage = HorarioValidator.getHorasFaltantesMessage(
    workedHours,
    horasNormales
  );

  // ======== Estados derivados ========
  const hasDayRecord = Boolean(registroDiario);
  const readOnly = !!(
    registroDiario?.aprobacionSupervisor || registroDiario?.aprobacionRrhh
  );

  const hasChangesInDayConfig = (): boolean => {
    if (!registroDiario) return false;
    const registroHoraEntrada = registroDiario.horaEntrada.substring(11, 16);
    const registroHoraSalida = registroDiario.horaSalida.substring(11, 16);

    return (
      dayConfigData.horaEntrada !== registroHoraEntrada ||
      dayConfigData.horaSalida !== registroHoraSalida ||
      sanitizeJornada(dayConfigData.jornada) !==
        sanitizeJornada(registroDiario.jornada as string) || // CHANGED
      dayConfigData.esDiaLibre !== registroDiario.esDiaLibre ||
      dayConfigData.esHoraCorrida !== registroDiario.esHoraCorrida ||
      dayConfigData.comentarioEmpleado !==
        (registroDiario.comentarioEmpleado || "")
    );
  };
  const dayConfigHasChanges = hasChangesInDayConfig();

  // ======== Handlers de Drawer (abrir/cerrar/editar) ========
  const handleDrawerOpen = async () => {
    setDrawerOpen(true);
    await loadJobs();

    // Para NUEVAS actividades, si no hay horas normales disponibles forzar Hora Extra
    const sinHorasDisponibles =
      horasNormales <= 0 || horasDisponiblesReales <= 0.01;

    if (sinHorasDisponibles) {
      setFormData((prev) => ({
        ...prev,
        horaExtra: true,
      }));
    }
  };
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingActivity(null);
    setEditingIndex(-1);
    setSelectedJob(null);
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
      ? activity.horaInicio.substring(11, 16)
      : "";
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

  React.useEffect(() => {
    if (editingActivity && jobs.length > 0 && editingActivity.jobId) {
      const job = jobs.find((j) => j.id === editingActivity.jobId);
      if (job) setSelectedJob(job);
    }
  }, [jobs, editingActivity]);

  React.useEffect(() => {
    if (drawerOpen) {
      loadJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.horaExtra, drawerOpen]);

  const handleDeleteActivity = async (index: number) => {
    if (!registroDiario?.actividades) return;

    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split("T")[0];

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
        jornada: sanitizeJornada(registroDiario.jornada as string), // CHANGED
        esDiaLibre: registroDiario.esDiaLibre,
        esHoraCorrida: registroDiario.esHoraCorrida,
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

  // ======== Handlers de Config del día ========
  const handleDayConfigInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = event.target;
    // CHANGED: si es jornada, siempre sanear
    const nextValue =
      name === "jornada"
        ? sanitizeJornada(value)
        : type === "checkbox"
        ? (checked as unknown as string)
        : value;

    setDayConfigData((prev) => ({
      ...prev,
      [name]: nextValue as any,
    }));
    if (dayConfigErrors[name]) {
      setDayConfigErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateDayConfig = (): boolean => {
    const errors: FormErrors = {};
    if (!dayConfigData.horaEntrada)
      errors.horaEntrada = "La hora de entrada es obligatoria";
    if (!dayConfigData.horaSalida)
      errors.horaSalida = "La hora de salida es obligatoria";
    setDayConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDayConfigSubmit = async () => {
    if (!validateDayConfig()) return;

    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split("T")[0];
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

      // Validar actividades contra el nuevo rango
      {
        getBoundsFromHHMM(dayConfigData.horaEntrada, dayConfigData.horaSalida);

        const acts = registroDiario?.actividades || [];
        const outOfRange = acts
          .map((act, idx) => ({
            idx,
            act,
            outside: isActivityOutsideRange(
              act as unknown as Activity,
              dayConfigData.horaEntrada,
              dayConfigData.horaSalida
            ),
          }))
          .filter((x) => x.outside);

        if (outOfRange.length > 0) {
          const rango = `${dayConfigData.horaEntrada} - ${dayConfigData.horaSalida}`;
          setSnackbar({
            open: true,
            severity: "error",
            message: `Hay ${outOfRange.length} actividad(es) fuera del nuevo rango (${rango}). Debes actualizarlas.`,
          });
          setLoading(false);
          return;
        }
      }

      const params = {
        fecha: dateString,
        horaEntrada: horaEntradaISO,
        horaSalida: horaSalidaISO,
        jornada: sanitizeJornada(dayConfigData.jornada), // CHANGED
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

  // ======== Form Drawer: handlers ========
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };

      // Si se cambia el checkbox de hora extra, limpiar campos según corresponda
      if (name === "horaExtra") {
        if (checked) {
          // Activar hora extra: limpiar horasInvertidas (se calculará automáticamente)
          next.horasInvertidas = "";
          // Limpiar selección de job (los especiales dejan de estar disponibles)
          if (selectedJob) {
            setSelectedJob(null);
          }
          next.job = "";
        } else {
          // Desactivar hora extra: limpiar horaInicio/horaFin
          next.horaInicio = "";
          next.horaFin = "";
          next.horasInvertidas = "";
        }
      }

      // Recalcular horas SOLO si es hora extra y cambian horaInicio/horaFin
      if (next.horaExtra && (name === "horaInicio" || name === "horaFin")) {
        const v = computeHorasInvertidas(
          next.horaInicio,
          next.horaFin,
          dayConfigData.esHoraCorrida,
          entradaHHMM,
          salidaHHMM
        );
        next.horasInvertidas = v;
      }

      // Validaciones en vivo SOLO para hora extra
      if (next.horaExtra && name === "horaInicio") {
        const errInicio = errorOutsideRange(
          "inicio",
          next.horaInicio,
          entradaHHMM,
          salidaHHMM
        );
        const errFin = computeHoraFinError(
          next.horaFin,
          next.horaInicio,
          entradaHHMM,
          salidaHHMM
        );
        setFormErrors((prevE) => ({
          ...prevE,
          horaInicio: errInicio,
          horaFin: errFin,
        }));
      } else if (next.horaExtra && name === "horaFin") {
        const errFin = computeHoraFinError(
          next.horaFin,
          next.horaInicio,
          entradaHHMM,
          salidaHHMM
        );
        setFormErrors((prevE) => ({ ...prevE, horaFin: errFin }));
      }

      // Limpiar error del campo cuando se edita
      if (formErrors[name]) {
        setFormErrors((prevE) => ({ ...prevE, [name]: "" }));
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
    const errors: FormErrors = {};
    const { horaInicio, horaFin } = formData;

    if (!formData.descripcion.trim())
      errors.descripcion = "La descripción es obligatoria";
    if (!formData.job.trim()) errors.job = "El job es obligatorio";

    // Validación diferente según si es hora extra o no
    if (formData.horaExtra) {
      // HORA EXTRA: validar hora inicio/fin (obligatorios)
      if (!horaInicio)
        errors.horaInicio = "Hora inicio obligatoria para hora extra";
      if (!horaFin) errors.horaFin = "Hora fin obligatoria para hora extra";

      // Si hay horas, calcular automáticamente
      if (horaInicio && horaFin) {
        const horasCalc = computeHorasInvertidas(
          horaInicio,
          horaFin,
          dayConfigData.esHoraCorrida,
          entradaHHMM,
          salidaHHMM
        );
        // Actualizar el campo automáticamente
        if (horasCalc && formData.horasInvertidas !== horasCalc) {
          setFormData((prev) => ({ ...prev, horasInvertidas: horasCalc }));
        }
      } else {
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
      }
    } else {
      // HORAS NORMALES: validar solo horasInvertidas (obligatorio, editable manualmente)
      if (!formData.horasInvertidas || formData.horasInvertidas.trim() === "") {
        errors.horasInvertidas = "Las horas invertidas son obligatorias";
      } else {
        const hours = parseFloat(formData.horasInvertidas);
        if (isNaN(hours) || hours <= 0)
          errors.horasInvertidas = "Ingresa un número válido mayor a 0";
      }
    }

    // Validaciones de rango y solapamiento SOLO para hora extra
    if (formData.horaExtra && horaInicio && horaFin) {
      const { dayStart, dayEnd, crossesMidnight } = getBoundsFromHHMM(
        entradaHHMM,
        salidaHHMM
      );
      const s = normalizeToDaySpan(
        timeToMinutes(horaInicio),
        dayStart,
        crossesMidnight
      );
      const e = normalizeToDaySpan(
        timeToMinutes(horaFin),
        dayStart,
        crossesMidnight
      );

      if (s < dayStart || s > dayEnd) {
        errors.horaInicio = "La hora de inicio está fuera del horario laboral";
      }
      if (e < dayStart || e > dayEnd) {
        errors.horaFin = "La hora de fin está fuera del horario laboral";
      }
      if (
        !crossesMidnight &&
        timeToMinutes(horaFin) <= timeToMinutes(horaInicio)
      ) {
        errors.horaFin = "La hora final debe ser posterior a la inicial";
      }

      // solape con otras actividades
      if (
        registroDiario?.actividades &&
        registroDiario.actividades.length > 0
      ) {
        let newS = s;
        let newE = e;
        if (newE <= newS) newE += 1440;

        const overlaps = registroDiario.actividades.some((act, idx) => {
          if (editingActivity && idx === editingIndex) return false;
          if (!act.horaInicio || !act.horaFin) return false;

          const sHM = act.horaInicio.substring(11, 16);
          const eHM = act.horaFin.substring(11, 16);
          let s2 = normalizeToDaySpan(
            timeToMinutes(sHM),
            dayStart,
            crossesMidnight
          );
          let e2 = normalizeToDaySpan(
            timeToMinutes(eHM),
            dayStart,
            crossesMidnight
          );
          if (e2 <= s2) e2 += 1440;

          return newS < e2 && s2 < newE;
        });

        if (overlaps) {
          errors.horaInicio = "Este horario se solapa con otra actividad";
          errors.horaFin = "Este horario se solapa con otra actividad";
        }
      }
    }

    // Validación de horas totales: no exceder las horas laborables
    // Solo aplica para actividades normales (no hora extra)
    if (!formData.horaExtra && formData.horasInvertidas) {
      const horasActuales = parseFloat(formData.horasInvertidas);
      if (!isNaN(horasActuales) && horasActuales > 0) {
        const horasDisponiblesValidacionForm =
          horasDisponiblesReales + editingHoursNormales;

        // Usar margen de error pequeño para evitar problemas de redondeo
        if (horasActuales > horasDisponiblesValidacionForm + 0.01) {
          const exceso = (
            horasActuales - horasDisponiblesValidacionForm
          ).toFixed(1);
          errors.horasInvertidas = `Excede las horas laborables. Disponibles: ${horasDisponiblesValidacionForm.toFixed(
            1
          )}h (te excedes por ${exceso}h)`;
        }
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

      // Construir actividad según si es hora extra o no
      const actividadBase: any = {
        jobId: parseInt(formData.job),
        duracionHoras: parseFloat(formData.horasInvertidas),
        esExtra: formData.horaExtra,
        className: formData.class || undefined,
        descripcion: formData.descripcion,
      };

      // Solo agregar horaInicio/horaFin si es hora extra
      if (formData.horaExtra && formData.horaInicio && formData.horaFin) {
        const startM = timeToMinutes(formData.horaInicio);
        const endM = timeToMinutes(formData.horaFin);
        const addDay = endM <= startM ? 1 : 0;

        actividadBase.horaInicio = buildISO(
          currentDate,
          formData.horaInicio,
          0
        );
        actividadBase.horaFin = buildISO(currentDate, formData.horaFin, addDay);
      }

      const actividad = actividadBase;

      if (registroDiario) {
        // actividades existentes
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

        // IMPORTANTE: Si estamos editando, reemplazar la actividad en el índice específico
        // Si es nueva actividad, agregar al final
        if (
          editingActivity !== null &&
          editingIndex >= 0 &&
          editingIndex < actividadesExistentes.length
        ) {
          // Modo edición: reemplazar actividad existente
          actividadesActualizadas = [...actividadesExistentes];
          actividadesActualizadas[editingIndex] = actividad;
        } else {
          // Modo creación: agregar nueva actividad
          actividadesActualizadas = [...actividadesExistentes, actividad];
        }

        const params = {
          fecha: dateString,
          horaEntrada: registroDiario.horaEntrada,
          horaSalida: registroDiario.horaSalida,
          jornada: sanitizeJornada(registroDiario.jornada as string), // CHANGED
          esDiaLibre: registroDiario.esDiaLibre,
          esHoraCorrida: registroDiario.esHoraCorrida,
          comentarioEmpleado: registroDiario.comentarioEmpleado,
          actividades: actividadesActualizadas,
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      } else {
        // crear nuevo registro del día
        if (!validateDayConfig()) return;

        const entradaM = timeToMinutes(dayConfigData.horaEntrada);
        const salidaM = timeToMinutes(dayConfigData.horaSalida);
        const addDayForEnd = salidaM <= entradaM ? 1 : 0;

        const params = {
          fecha: dateString,
          horaEntrada: buildISO(currentDate, dayConfigData.horaEntrada, 0),
          horaSalida: buildISO(
            currentDate,
            dayConfigData.horaSalida,
            addDayForEnd
          ),
          jornada: sanitizeJornada(dayConfigData.jornada), // CHANGED
          esDiaLibre: dayConfigData.esDiaLibre,
          esHoraCorrida: dayConfigData.esHoraCorrida,
          comentarioEmpleado: dayConfigData.comentarioEmpleado,
          actividades: [actividad],
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      }

      const actionMessage = editingActivity
        ? "Actividad actualizada correctamente"
        : "Actividad guardada correctamente";
      setSnackbar({ open: true, message: actionMessage, severity: "success" });

      // Limpiar estados de edición
      setEditingActivity(null);
      setEditingIndex(-1);

      handleDrawerClose();
    } catch (e) {
      console.error("Error al guardar actividad:", e);
      const message = (e as Error).message || "Error al guardar la actividad";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Nota: Los useEffect de recálculo automático se eliminaron para permitir edición manual
  // El recálculo se hace en handleInputChange cuando cambian horaInicio/horaFin (líneas 584-594)

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: "100%" }}>
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
            startIcon={<Settings />}
            onClick={handleDayConfigSubmit}
            size="small"
            color={hasDayRecord ? "success" : "primary"}
            sx={{ ml: 1 }}
            disabled={loading || (hasDayRecord && !dayConfigHasChanges)}
          >
            {loading
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

      {/* Chips de info del día */}
      {registroDiario && (
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 2 }}
        >
          {horarioValidado?.mostrarJornada && (
            <Chip
              // CHANGED: jornada saneada para etiqueta
              label={`Jornada: ${
                sanitizeJornada(registroDiario.jornada as string) === "D"
                  ? "Dia"
                  : "Noche"
              }`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          <Chip
            label={`${entradaHHMM} - ${salidaHHMM}`}
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
          {registroDiario.esHoraCorrida && (
            <Chip
              label="Hora Corrida"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>
      )}

      {/* Festivo */}
      {horarioValidado?.mostrarNombreFestivo &&
        horarioValidado.nombreDiaFestivo && (
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Chip
              label={`🎉 ${horarioValidado.nombreDiaFestivo}`}
              size="medium"
              color="success"
              variant="filled"
            />
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
              name="horaEntrada"
              label="Hora de Entrada"
              value={dayConfigData.horaEntrada}
              onChange={handleDayConfigInputChange}
              error={!!dayConfigErrors.horaEntrada}
              helperText={dayConfigErrors.horaEntrada}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
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

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {horarioValidado?.mostrarJornada && (
              <FormControl fullWidth size="small">
                <InputLabel>Jornada</InputLabel>
                <Select
                  disabled={readOnly}
                  name="jornada"
                  value={sanitizeJornada(dayConfigData.jornada)} // CHANGED
                  onChange={(e) =>
                    handleDayConfigInputChange(
                      e as unknown as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                  label="Jornada"
                >
                  <MenuItem value="D">Día</MenuItem>
                  <MenuItem value="N">Noche</MenuItem>
                </Select>
              </FormControl>
            )}

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
            <Typography variant="h6" component="h2">
              Progreso del Día Laboral
            </Typography>
            <Box sx={{ ml: "auto" }}>
              <Typography
                variant="body2"
                color="primary.main"
                fontWeight="bold"
              >
                {workedHours.toFixed(1)} / {horasNormales.toFixed(1)} horas
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
            {horasFaltantesMessage}
          </Typography>
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
            disabled={readOnly}
            variant="contained"
            startIcon={<Add />}
            sx={{ borderRadius: 2 }}
            onClick={handleDrawerOpen}
          >
            Nueva Actividad
          </Button>
        )}
      </Box>

      {registroDiario?.actividades && registroDiario.actividades.length > 0 ? (
        <Stack spacing={2}>
          {registroDiario.actividades.map((actividad, index) => (
            <Card
              key={actividad.id || index}
              sx={{ bgcolor: "background.paper" }}
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`${computeHorasActividadForDisplay(
                          actividad as unknown as Activity,
                          dayConfigData.esHoraCorrida,
                          entradaHHMM,
                          salidaHHMM
                        )}h`}
                        size="small"
                        color="primary"
                      />
                      {actividad.esExtra && (
                        <Chip label="Extra" size="small" color="warning" />
                      )}
                    </Stack>
                    <IconButton
                      disabled={readOnly}
                      size="small"
                      onClick={() =>
                        handleEditActivity(
                          actividad as unknown as Activity,
                          index
                        )
                      }
                      sx={{ color: "primary.main" }}
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

                <Typography variant="body1" color="text.primary">
                  {actividad.descripcion}
                </Typography>
              </CardContent>
            </Card>
          ))}
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
          >
            Agregar Actividad
          </Button>
        </Box>
      )}

      {/* FAB en mobile */}
      {isMobile && (
        <Fab
          variant="extended"
          color="primary"
          aria-label="add"
          onClick={handleDrawerOpen}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            textTransform: "none",
          }}
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

            {/* Hora Extra: mostrar hora inicio/fin */}
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
            )}

            {/* Campo Horas Invertidas */}
            {/* Horas Normales: editable manualmente. Hora Extra: calculado automáticamente (readonly) */}
            <TextField
              fullWidth
              required
              name="horasInvertidas"
              label="Horas Invertidas"
              placeholder="Ej: 2.5"
              type="number"
              value={formData.horasInvertidas}
              onChange={handleInputChange}
              error={!!formErrors.horasInvertidas}
              helperText={
                formData.horaExtra
                  ? "Calculado automáticamente para Hora Extra"
                  : formErrors.horasInvertidas
              }
              InputProps={{
                readOnly: readOnly || formData.horaExtra,
              }}
              sx={{ mb: 3 }}
            />

            {/* Job Autocomplete */}
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
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {option.codigo} - {option.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.empresa?.nombre || "Sin empresa"}
                      </Typography>
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
              label={`Hora Extra (fuera del horario ${entradaHHMM} - ${salidaHHMM})`}
              sx={{ mb: 3 }}
            />

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
}
