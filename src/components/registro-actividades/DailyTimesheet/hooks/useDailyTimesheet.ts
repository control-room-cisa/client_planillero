import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { useAuth } from "../../../../hooks/useAuth";
import RegistroDiarioService from "../../../../services/registroDiarioService";
import JobService from "../../../../services/jobService";
import CalculoHorasTrabajoService from "../../../../services/calculoHorasTrabajoService";
import { HorarioValidator } from "../../../../utils/horarioValidations";
import useHorarioRules from "../../../../hooks/useHorarioRules";
import { HorarioRulesFactory } from "../../../../utils/horarioRules";
import type { Job } from "../../../../services/jobService";
import type { RegistroDiarioData } from "../../../../dtos/RegistrosDiariosDataDto";
import type { Activity, ActivityData } from "../../types";
import {
  ymdInTZ,
  formatTimeLocal,
  buildISO,
  timeToMinutes,
  minutesToHHMM,
  isValidTimeFormat,
  adjustTime,
  roundToQuarterHour,
  errorOutsideRange,
  computeHoraFinError,
  computeHorasInvertidas,
  formatHours,
  computeHorasActividadForDisplayNum,
  buildIntervals,
  getBoundsFromHHMM,
  splitActivityIntervals,
  isActivityOutsideRange,
  formatDate,
} from "../utils";

// Tipos específicos
export type JobConJerarquia = Job & {
  indentLevel: number;
  parentCodigo?: string | null;
};

export const useDailyTimesheet = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const { fecha } = useParams<{ fecha?: string }>();
  const navigate = useNavigate();

  // Inicializar currentDate desde la URL o usar la fecha actual
  const [currentDate, setCurrentDate] = React.useState(() => {
    if (fecha) {
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
    esCompensatorio: false,
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
    jornada: "D",
    esDiaLibre: false,
    // Client-only: no se persiste al backend. Solo fuerza 07:00-07:00 (0 horas).
    esDiaNoLaborable: false,
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
    tipoHorario: string;
  } | null>(null);

  // Estado para guardar los datos del horario completo
  const [horarioData, setHorarioData] = React.useState<{
    cantidadHorasLaborables: number;
    esFestivo: boolean;
    cantidadHorasLaborablesNormales: number;
  } | null>(null);

  // Reglas de UI ahora controlan visibilidad/habilitación por tipo de horario
  const horarioRules = useHorarioRules({
    tipoHorario: horarioValidado?.tipoHorario || undefined,
    formData: dayConfigData,
    apiData: horarioValidado,
  });

  // === Banderas por tipo de horario (códigos canónicos del backend) ===
  const isH2 = horarioValidado?.tipoHorario === "H2_1";
  const isH2_2 = horarioValidado?.tipoHorario === "H2_2";
  const isH1 = ["H1_1", "H1_2"].includes(horarioValidado?.tipoHorario || "");
  const isHoliday = Boolean(
    horarioData?.esFestivo || horarioValidado?.esFestivo
  );

  // Mostrar "Día no laborable" cuando NO existe Día Libre en UI y las horas son editables.
  const showDiaNoLaborable = Boolean(
    !horarioRules.utils.isFieldVisible("esDiaLibre") &&
      horarioRules.utils.isFieldEnabled("horaEntrada") &&
      horarioRules.utils.isFieldEnabled("horaSalida")
  );

  // ===== Helpers de tiempo =====
  const getH2Schedule = React.useCallback(
    (jornadaValue?: string | null, targetDate?: Date) => {
      if (jornadaValue === "D") {
        return { horaEntrada: "07:00", horaSalida: "19:00" };
      }
      if (jornadaValue === "N") {
        const referenceDate = targetDate ?? currentDate;
        const day = referenceDate.getDay();
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
      if (horarioValidado?.tipoHorario === "H2_1") {
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

  // Wrappers que usan horarioRules para calcular hora de almuerzo
  const computeHorasInvertidasWrapper = React.useCallback(
    (inicioHHMM: string, finHHMM: string, isExtraHour = false): string => {
      const horaAlmuerzo = horarioRules.utils.calculateLunchHours();
      return computeHorasInvertidas(
        inicioHHMM,
        finHHMM,
        isExtraHour,
        horaAlmuerzo
      );
    },
    [horarioRules.utils]
  );

  const computeHorasActividadForDisplayNumWrapper = React.useCallback(
    (act: Activity): number => {
      const horaAlmuerzo = horarioRules.utils.calculateLunchHours();
      return computeHorasActividadForDisplayNum(act, horaAlmuerzo);
    },
    [horarioRules.utils]
  );

  const computeHorasActividadForDisplayWrapper = React.useCallback(
    (act: Activity): string =>
      formatHours(computeHorasActividadForDisplayNumWrapper(act)),
    [computeHorasActividadForDisplayNumWrapper]
  );

  // Usar ref para evitar bucle infinito en el efecto de redirección
  const hasRedirected = React.useRef(false);

  // ===== Sincronizar fecha con URL cuando cambie el parámetro =====
  React.useEffect(() => {
    if (fecha) {
      const [year, month, day] = fecha.split("-").map(Number);
      const dateFromUrl = new Date(year, month - 1, day);
      const currentDateStr = ymdInTZ(currentDate);
      const urlDateStr = ymdInTZ(dateFromUrl);

      if (currentDateStr !== urlDateStr) {
        setCurrentDate(dateFromUrl);
        setInitialLoading(true);
      }
      hasRedirected.current = false;
    } else if (!hasRedirected.current) {
      hasRedirected.current = true;
      const today = new Date();
      const fechaString = ymdInTZ(today);
      navigate(`/registro-actividades/${fechaString}`, { replace: true });
    }
  }, [fecha, currentDate, navigate]);

  // Cargar jobs cuando se abra el drawer
  const loadJobs = React.useCallback(async (horaExtraOverride?: boolean) => {
    try {
      setLoadingJobs(true);
      const jobsData = await JobService.getAll();
      const jobsActivos = jobsData.filter((j) => j.activo === true);

      // REGLA: Si horaExtra=true, mostrar SOLO jobs NO especiales
      // Si horaExtra=false, mostrar TODOS los jobs (incluyendo especiales)
      // Usar el override si se proporciona, de lo contrario usar formData.horaExtra
      const horaExtraValue = horaExtraOverride !== undefined ? horaExtraOverride : formData.horaExtra;
      const jobsFiltrados = horaExtraValue
        ? jobsActivos.filter((j) => !j.especial)
        : jobsActivos;

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
  }, [formData.horaExtra]);

  const readOnly = !!(
    registroDiario?.aprobacionSupervisor || registroDiario?.aprobacionRrhh
  );

  // Nueva función para cargar validaciones de horario
  const loadHorarioValidations = React.useCallback(
    async (fecha: string, registro: RegistroDiarioData | null) => {
      try {
        if (!user?.id) return;

        const horarioData = await CalculoHorasTrabajoService.getHorarioTrabajo(
          user.id,
          fecha
        );

        console.log("[DEBUG] horarioData desde API:", horarioData);
        console.log("[DEBUG] horarioData.esDiaLibre:", horarioData.esDiaLibre);

        const datosExistentes = Boolean(registro);

        const validacion = HorarioValidator.validateByTipo(
          horarioData.tipoHorario,
          horarioData,
          datosExistentes
        );

        let cantidadHorasLaborablesNormales =
          horarioData.cantidadHorasLaborables;
        if (horarioData.esFestivo) {
          const fechaObj = new Date(`${fecha}T00:00:00`);
          const diaSemana = fechaObj.getDay();

          if (diaSemana === 5) {
            cantidadHorasLaborablesNormales = 8;
          } else if (diaSemana === 0 || diaSemana === 6) {
            cantidadHorasLaborablesNormales = 0;
          } else {
            cantidadHorasLaborablesNormales = 9;
          }
        }

        setHorarioData({
          cantidadHorasLaborables: horarioData.cantidadHorasLaborables,
          esFestivo: horarioData.esFestivo,
          cantidadHorasLaborablesNormales,
        });

        const validacionCompleta = {
          ...validacion,
          horasNormales: horarioData.cantidadHorasLaborables,
          tipoHorario: horarioData.tipoHorario,
        };

        setHorarioValidado(validacionCompleta);

        if (validacion) {
          setDayConfigData((prev) => {
            const base = HorarioRulesFactory.processApiDefaults(
              horarioData.tipoHorario,
              prev,
              horarioData,
              datosExistentes
            );

            if (datosExistentes && registro) {
              if (["H1_1", "H1_2"].includes(horarioData.tipoHorario)) {
                return {
                  ...base,
                  jornada: registro.jornada || base.jornada,
                  esDiaLibre: Boolean(horarioData.esDiaLibre),
                  esDiaNoLaborable: false,
                  esIncapacidad: registro.esIncapacidad || false,
                  comentarioEmpleado: registro.comentarioEmpleado || "",
                };
              } else if (
                ["H1_3", "H1_4", "H1_5", "H1_6"].includes(horarioData.tipoHorario)
              ) {
                return {
                  ...base,
                  // Jornada siempre fija en día para H1 editables
                  jornada: "D",
                  horaEntrada: formatTimeLocal(registro.horaEntrada),
                  horaSalida: formatTimeLocal(registro.horaSalida),
                  esDiaLibre: false,
                  esDiaNoLaborable: false,
                  esIncapacidad: registro.esIncapacidad || false,
                  comentarioEmpleado: registro.comentarioEmpleado || "",
                };
              } else if (horarioData.tipoHorario === "H2_2") {
                return {
                  ...base,
                  // Jornada siempre fija en día para H2_2
                  jornada: "D",
                  horaEntrada: formatTimeLocal(registro.horaEntrada),
                  horaSalida: formatTimeLocal(registro.horaSalida),
                  esDiaLibre: Boolean(horarioData.esDiaLibre),
                  esDiaNoLaborable: false,
                  esIncapacidad: registro.esIncapacidad || false,
                  comentarioEmpleado: registro.comentarioEmpleado || "",
                };
              } else {
                return {
                  ...base,
                  jornada: registro.jornada || base.jornada,
                  horaEntrada: formatTimeLocal(registro.horaEntrada),
                  horaSalida: formatTimeLocal(registro.horaSalida),
                  esDiaLibre: Boolean(horarioData.esDiaLibre),
                  esDiaNoLaborable: false,
                  esIncapacidad: registro.esIncapacidad || false,
                  comentarioEmpleado: registro.comentarioEmpleado || "",
                };
              }
            }

            const result = {
              ...base,
              esDiaLibre: ["H1_3", "H1_4", "H1_5", "H1_6"].includes(
                horarioData.tipoHorario
              )
                ? false
                : Boolean(horarioData.esDiaLibre),
              esDiaNoLaborable: false,
              esIncapacidad: registro?.esIncapacidad || false,
              comentarioEmpleado:
                registro?.comentarioEmpleado ||
                (horarioData.esFestivo && horarioData.nombreDiaFestivo
                  ? horarioData.nombreDiaFestivo
                  : ""),
            };

            return result;
          });
        }
      } catch (error) {
        console.error("Error al cargar validaciones de horario:", error);
      }
    },
    [user?.id]
  );

  const loadRegistroDiario = React.useCallback(async () => {
    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);

      setDayConfigData({
        horaEntrada: "",
        horaSalida: "",
        jornada: "D",
        esDiaLibre: false,
        esDiaNoLaborable: false,
        esIncapacidad: false,
        esHoraCorrida: false,
        comentarioEmpleado: "",
      });
      setRegistroDiario(null);

      const [registro] = await Promise.all([
        RegistroDiarioService.getByDate(dateString),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);

      setRegistroDiario(registro);
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
  }, [currentDate, loadHorarioValidations]);

  // ===== Carga inicial =====
  React.useEffect(() => {
    loadRegistroDiario();
  }, [loadRegistroDiario]);

  // ===== Drawer =====
  const handleDrawerClose = React.useCallback(() => {
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
      esCompensatorio: false,
    });
    setFormErrors({});
  }, []);

  const handleEditActivity = React.useCallback(
    async (activity: Activity, index: number) => {
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
        horasInvertidas: activity.duracionHoras?.toString() || "",
        job: activity.jobId?.toString() || "",
        class: activity.className || "",
        horaExtra: activity.esExtra || false,
        esCompensatorio: activity.esCompensatorio || false,
      });
      setDrawerOpen(true);
      await loadJobs();
    },
    [loadJobs]
  );

  // Efecto para recargar jobs cuando cambie hora extra
  React.useEffect(() => {
    if (drawerOpen) {
      loadJobs();
    }
  }, [formData.horaExtra, drawerOpen, loadJobs]);

  // Efecto para establecer el job seleccionado cuando se cargan los jobs y hay una actividad en edición
  React.useEffect(() => {
    if (editingActivity && jobs.length > 0 && editingActivity.jobId) {
      const job = jobs.find((j) => j.id === editingActivity.jobId);
      if (job) setSelectedJob(job);
    }
  }, [jobs, editingActivity]);

  const handleDeleteActivity = React.useCallback(
    async (index: number) => {
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
    },
    [registroDiario, currentDate, isH2]
  );

  // ===== Config del día =====
  const handleDayConfigTimeKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const target = event.target as HTMLInputElement;
      const { name, value } = target;

      if (!["horaEntrada", "horaSalida"].includes(name)) return;

      let currentValue = value;
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
        setTimeout(() => {
          target.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      }
    },
    []
  );

  const handleDayConfigInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = event.target;
      let finalValue = type === "checkbox" ? checked : value;

      const horasCero =
        HorarioRulesFactory.calculateNormalHours(
          horarioValidado?.tipoHorario,
          dayConfigData,
          horarioValidado,
          { now: currentDate }
        ) === 0;

      if (name === "esHoraCorrida" && horasCero) {
        return;
      }

      if (
        (isHoliday ||
          dayConfigData.esDiaLibre ||
          dayConfigData.esDiaNoLaborable ||
          dayConfigData.esIncapacidad) &&
        (name === "horaEntrada" || name === "horaSalida")
      ) {
        return;
      }

      // Client-only: Día no laborable (no se envía al backend)
      if (name === "esDiaNoLaborable") {
        setDayConfigData((prev) => {
          if (Boolean(finalValue)) {
            return {
              ...prev,
              esDiaNoLaborable: true,
              jornada: "D",
              horaEntrada: "07:00",
              horaSalida: "07:00",
            };
          }

          // Al deseleccionar: restaurar desde registro diario si existe; si no, usar defaults del backend.
          if (registroDiario?.horaEntrada && registroDiario?.horaSalida) {
            return {
              ...prev,
              esDiaNoLaborable: false,
              jornada: "D",
              horaEntrada: formatTimeLocal(registroDiario.horaEntrada),
              horaSalida: formatTimeLocal(registroDiario.horaSalida),
            };
          }

          const defaults = getDefaultHorario("D");
          return {
            ...prev,
            esDiaNoLaborable: false,
            jornada: "D",
            horaEntrada: defaults.horaEntrada,
            horaSalida: defaults.horaSalida,
          };
        });
        return;
      }

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

        if (horarioValidado?.tipoHorario === "H2_1") {
          if (name === "esDiaLibre" || name === "esIncapacidad") {
            if (finalValue) {
              next = {
                ...next,
                jornada: "",
                horaEntrada: "07:00",
                horaSalida: "07:00",
              };
              // En H2, si se marca incapacidad, deshabilitar Día Libre
              if (name === "esIncapacidad" && finalValue) {
                next.esDiaLibre = false;
              }
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
        } else if (isH2_2 && (name === "esDiaLibre" || name === "esIncapacidad")) {
          // En H2_2: Jornada siempre fija en día ("D").
          // - Día Libre: fuerza 07:00 - 07:00
          // - Incapacidad: mantener rango colapsado (horaSalida = horaEntrada por defecto) sin cambiar a nocturno
          // En H2_2: Día Libre fuerza 07:00 - 07:00 (sin importar el horario del backend)
          const defaults = getDefaultHorario("D");
          if (finalValue) {
            if (name === "esDiaLibre") {
              next = {
                ...next,
                jornada: "D",
                horaEntrada: "07:00",
                horaSalida: "07:00",
              };
            } else {
              // esIncapacidad=true
              next = {
                ...next,
                jornada: "D",
                horaEntrada: defaults.horaEntrada,
                horaSalida: defaults.horaEntrada,
              };
            }
          } else {
            next = {
              ...next,
              jornada: "D",
              horaEntrada: defaults.horaEntrada,
              horaSalida: defaults.horaSalida,
            };
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
    },
    [
      horarioRules.utils,
      horarioValidado?.tipoHorario,
      isH2_2,
      isHoliday,
      currentDate,
      getDefaultHorario,
      getH2Schedule,
      dayConfigData,
      dayConfigErrors,
      registroDiario,
    ]
  );

  const validateDayConfig = React.useCallback((): boolean => {
    const errors: { [key: string]: string } = {};
    if (!dayConfigData.horaEntrada)
      errors.horaEntrada = "La hora de entrada es obligatoria";
    if (!dayConfigData.horaSalida)
      errors.horaSalida = "La hora de salida es obligatoria";
    setDayConfigErrors(errors);
    return Object.keys(errors).length === 0;
  }, [dayConfigData]);

  const hasChangesInDayConfig = React.useCallback((): boolean => {
    if (!registroDiario) return false;
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
  }, [registroDiario, dayConfigData]);

  const handleDayConfigSubmit = React.useCallback(async () => {
    if (!validateDayConfig()) return;

    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);
      const horaEntradaISO = buildISO(
        currentDate,
        dayConfigData.horaEntrada,
        0
      );
      const startM = timeToMinutes(dayConfigData.horaEntrada);
      const endM = timeToMinutes(dayConfigData.horaSalida);
      const addDayForEnd = endM <= startM ? 1 : 0;
      const horaSalidaISO = buildISO(
        currentDate,
        dayConfigData.horaSalida,
        addDayForEnd
      );

      {
        // En días de 0 horas (feriado / día libre / día no laborable / entrada==salida),
        // no validar traslapes ni actividades fuera de rango.
        const shouldSkipRangeValidation =
          isHoliday ||
          dayConfigData.esDiaLibre ||
          dayConfigData.esDiaNoLaborable ||
          dayConfigData.horaEntrada === dayConfigData.horaSalida;
        if (shouldSkipRangeValidation) {
          // skip
        } else {
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
            return;
          }
        }
      }

      const esDiaLibreFinal = dayConfigData.esDiaLibre;
      const esIncapacidadFinal = dayConfigData.esIncapacidad;
      const horasCero =
        HorarioRulesFactory.calculateNormalHours(
          horarioValidado?.tipoHorario,
          dayConfigData,
          horarioValidado,
          { now: currentDate }
        ) === 0;
      const esHoraCorridaFinal = isH2
        ? true
        : horasCero
        ? false
        : dayConfigData.esHoraCorrida;

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
  }, [
    validateDayConfig,
    currentDate,
    dayConfigData,
    registroDiario,
    isH2,
    horarioValidado,
    horarioData,
  ]);

  // ===== Form actividad =====
  const handleTimeKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const target = event.target as HTMLInputElement;
      const { name, value } = target;

      if (!["horaInicio", "horaFin"].includes(name)) return;

      let currentValue = value;
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
        let displayValue = newValue;
        if (name === "horaFin" && newValue === "24:00") {
          displayValue = "00:00";
        }

        const syntheticEvent = {
          target: { name, value: displayValue, type: "time" },
        } as React.ChangeEvent<HTMLInputElement>;

        handleInputChange(syntheticEvent);

        setTimeout(() => {
          target.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      }
    },
    []
  );

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = event.target;

      setFormData((prev) => {
        let finalValue = type === "checkbox" ? checked : value;

        if (
          type !== "checkbox" &&
          (name === "horaInicio" || name === "horaFin")
        ) {
          finalValue = roundToQuarterHour(value);

          if (name === "horaFin" && value === "00:00") {
            const inicioMinutos = timeToMinutes(prev.horaInicio || "00:00");
            if (inicioMinutos > 0) {
              finalValue = "24:00";
            }
          }
        }

        const next = { ...prev, [name]: finalValue };

        // Para horas normales: restringir a formato numérico (máx 2 enteros, 2 decimales)
        if (!next.horaExtra && name === "horasInvertidas") {
          const raw = (value as string).replace(",", ".");
          // Regex: opcionalmente hasta 2 dígitos, opcionalmente punto y hasta 2 dígitos
          const match = raw.match(/^\d{0,2}(\.\d{0,2})?/);
          next.horasInvertidas = match ? match[0] : "";
        }

        if (name === "horaExtra") {
          if (checked) {
            if (next.horaInicio && next.horaFin) {
              const v = computeHorasInvertidasWrapper(
                next.horaInicio,
                next.horaFin,
                true
              );
              next.horasInvertidas = v;
            }
            if (selectedJob?.especial) {
              setSelectedJob(null);
              next.job = "";
            }
          } else {
            next.horaInicio = "";
            next.horaFin = "";
            next.horasInvertidas = "";
          }
        }

        // Limpiar job cuando se activa compensatorio en hora normal (excepción: no requiere job)
        if (name === "esCompensatorio" && checked && !next.horaExtra) {
          setSelectedJob(null);
          next.job = "";
          if (formErrors.job) {
            setFormErrors((prev) => ({ ...prev, job: "" }));
          }
        }

        if ((name === "horaInicio" || name === "horaFin") && next.horaExtra) {
          if (next.horaInicio && next.horaFin) {
            const v = computeHorasInvertidasWrapper(
              next.horaInicio,
              next.horaFin,
              true
            );
            next.horasInvertidas = v;
          }
        }

        // Limpiar job cuando se activa compensatorio en hora normal (excepción: no requiere job)
        if (name === "esCompensatorio" && checked && !next.horaExtra) {
          setSelectedJob(null);
          next.job = "";
          if (formErrors.job) {
            setFormErrors((prev) => ({ ...prev, job: "" }));
          }
        }

        if (name === "horaInicio") {
          const errInicio = errorOutsideRange();
          const errFin = computeHoraFinError(next.horaFin, next.horaInicio);
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
    },
    [computeHorasInvertidasWrapper, selectedJob]
  );

  const handleJobChange = React.useCallback(
    (_e: React.SyntheticEvent, value: JobConJerarquia | null) => {
      setSelectedJob(value);
      setFormData((prev) => ({
        ...prev,
        job: value ? value.id.toString() : "",
      }));
      if (formErrors.job) setFormErrors((prev) => ({ ...prev, job: "" }));
    },
    [formErrors.job]
  );

  const handleHorasBlur = React.useCallback(() => {
    if (formData.horaExtra) return;
    const val = parseFloat(formData.horasInvertidas);
    if (!isNaN(val) && val > 0) {
      const rounded = Math.round(val * 4) / 4;
      setFormData((prev) => ({ ...prev, horasInvertidas: rounded.toFixed(2) }));
    } else {
      setFormData((prev) => ({ ...prev, horasInvertidas: "" }));
    }
  }, [formData.horaExtra, formData.horasInvertidas]);

  // ===== Horas trabajadas / Totales & progreso =====
  const workedHoursNormales =
    registroDiario?.actividades?.reduce((acc, act) => {
      if (!act.esExtra) {
        return acc + (act.duracionHoras || 0);
      }
      return acc;
    }, 0) || 0;

  const horasNormales = HorarioRulesFactory.calculateNormalHours(
    horarioValidado?.tipoHorario,
    dayConfigData,
    horarioValidado,
    { now: currentDate }
  );

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

  const canAddExtraHours = horasNormales === 0 || horasRestantesDia <= 0.01;
  // Hora corrida no aplica en H2_1 y no tiene sentido cuando el día tiene 0 horas.
  const disableHoraCorrida = isH2 || horasNormales === 0;
  const disableTimeFields =
    dayConfigData.esDiaLibre ||
    dayConfigData.esDiaNoLaborable ||
    dayConfigData.esIncapacidad ||
    isHoliday;

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
   * Se considera excedencia cuando:
   * - Las horas trabajadas son mayores que las horas normales disponibles (si horasNormales > 0)
   * - O hay horas trabajadas cuando las horas normales disponibles son 0
   */
  const exceededNormalHours =
    horasNormales > 0
      ? Math.max(0, workedHoursNormales - horasNormales)
      : workedHoursNormales > 0
      ? workedHoursNormales
      : 0;
  const hasExceededNormalHours = exceededNormalHours > 0;

  const hasDayRecord = Boolean(registroDiario);
  const dayConfigHasChanges = hasChangesInDayConfig();
  const forceExtra = horasNormales === 0;
  const horasCero = horasNormales === 0;

  const shouldForceExtra = !editingActivity;
  const isProgressComplete = horasRestantesDia <= 0.01;
  const isProgressIncomplete = horasRestantesDia > 0.01;

  // Validación del formulario
  const validateForm = React.useCallback((): boolean => {
    const errors: { [key: string]: string } = {};
    const { horaInicio, horaFin } = formData;

    if (!formData.descripcion.trim())
      errors.descripcion = "La descripción es obligatoria";

    // Excepción: job NO es obligatorio cuando es compensatorio en hora normal (Tomar hora libre compensatoria)
    // En todos los demás casos, el job es obligatorio
    const esCompensatorioHoraNormal =
      formData.esCompensatorio && !formData.horaExtra;
    if (!esCompensatorioHoraNormal && !formData.job.trim()) {
      errors.job = "El job es obligatorio";
    }

    if (formData.horaExtra && !canAddExtraHours) {
      errors.horaExtra =
        "Solo puedes ingresar horas extra cuando hayas completado el 100% de las horas normales del día";
    }

    if (formData.horaExtra) {
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

      if (horaInicio && horaFin) {
        const horasCalc = computeHorasInvertidasWrapper(
          horaInicio,
          horaFin,
          true
        );
        if (!horasCalc || parseFloat(horasCalc) <= 0) {
          errors.horasInvertidas = "Las horas calculadas no son válidas";
        }
      }
    } else {
      if (!formData.horasInvertidas.trim()) {
        errors.horasInvertidas =
          "Las horas invertidas son obligatorias para actividades normales";
      } else {
        const hours = parseFloat(formData.horasInvertidas);
        if (isNaN(hours) || hours <= 0) {
          errors.horasInvertidas = "Ingresa un número válido mayor a 0";
        } else {
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

      if (
        timeToMinutes(horaFin) <= timeToMinutes(horaInicio) &&
        finMin <= inicioMin + 1440
      ) {
        errors.horaFin = "La hora final debe ser posterior a la inicial";
      }

      if (
        registroDiario?.actividades &&
        registroDiario.actividades.length > 0
      ) {
        const overlaps = registroDiario.actividades.some((act) => {
          if (editingActivity) {
            if (editingActivity.id && act.id && editingActivity.id === act.id) {
              return false;
            }
            if (editingActivity === act) {
              return false;
            }
          }

          if (!act.horaInicio || !act.horaFin) return false;

          const actInicioMin = timeToMinutes(formatTimeLocal(act.horaInicio));
          let actFinMin = timeToMinutes(formatTimeLocal(act.horaFin));

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
  }, [
    formData,
    canAddExtraHours,
    isValidTimeFormat,
    computeHorasInvertidasWrapper,
    horasDisponiblesValidacionForm,
    dayConfigData,
    registroDiario,
    editingActivity,
    horasNormales,
  ]);

  const handleSubmit = React.useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const dateString = ymdInTZ(currentDate);

      const startM = timeToMinutes(formData.horaInicio);
      const endM =
        formData.horaFin === "24:00" ? 1440 : timeToMinutes(formData.horaFin);
      const addDay = endM <= startM ? 1 : 0;

      // Excepción: jobId no es necesario cuando es compensatorio en hora normal
      const esCompensatorioHoraNormal =
        formData.esCompensatorio && !formData.horaExtra;
      const actividad: any = {
        jobId: esCompensatorioHoraNormal ? undefined : parseInt(formData.job),
        esExtra: formData.horaExtra,
        esCompensatorio: formData.esCompensatorio,
        className: formData.class || undefined,
        descripcion: formData.descripcion,
      };

      if (formData.horaExtra) {
        actividad.duracionHoras = parseFloat(
          computeHorasInvertidasWrapper(
            formData.horaInicio,
            formData.horaFin,
            true
          )
        );
        actividad.horaInicio = buildISO(currentDate, formData.horaInicio, 0);
        actividad.horaFin = buildISO(currentDate, formData.horaFin, addDay);
      } else {
        actividad.duracionHoras = parseFloat(formData.horasInvertidas || "0");
        actividad.horaInicio = undefined;
        actividad.horaFin = undefined;
      }

      if (registroDiario) {
        const actividadesExistentes =
          registroDiario.actividades?.map((act) => ({
            jobId: act.jobId,
            duracionHoras: act.duracionHoras,
            esExtra: act.esExtra,
            esCompensatorio: act.esCompensatorio,
            className: act.className,
            descripcion: act.descripcion,
            horaInicio: act.horaInicio,
            horaFin: act.horaFin,
          })) || [];

        let actividadesActualizadas;

        if (editingActivity && editingIndex >= 0) {
          actividadesActualizadas = [...actividadesExistentes];
          actividadesActualizadas[editingIndex] = actividad;
        } else {
          actividadesActualizadas = [...actividadesExistentes, actividad];
        }

        const entradaM = timeToMinutes(dayConfigData.horaEntrada);
        const salidaM = timeToMinutes(dayConfigData.horaSalida);
        const addDayForEnd = salidaM <= entradaM ? 1 : 0;

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
        if (!validateDayConfig()) return;

        const entradaM = timeToMinutes(dayConfigData.horaEntrada);
        const salidaM = timeToMinutes(dayConfigData.horaSalida);
        const addDayForEnd = salidaM <= entradaM ? 1 : 0;

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
  }, [
    validateForm,
    currentDate,
    formData,
    computeHorasInvertidasWrapper,
    registroDiario,
    editingActivity,
    editingIndex,
    dayConfigData,
    isH2,
    horarioData,
    validateDayConfig,
    handleDrawerClose,
  ]);

  // ===== Navegación de fecha =====
  const navigateDate = React.useCallback(
    (direction: "prev" | "next") => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + (direction === "prev" ? -1 : 1));
      setInitialLoading(true);
      setCurrentDate(d);
      const fechaString = ymdInTZ(d);
      navigate(`/registro-actividades/${fechaString}`);
    },
    [currentDate, navigate]
  );

  const goToToday = React.useCallback(() => {
    const today = new Date();
    setInitialLoading(true);
    setCurrentDate(today);
    const fechaString = ymdInTZ(today);
    navigate(`/registro-actividades/${fechaString}`);
  }, [navigate]);

  const isToday = React.useCallback(
    () => ymdInTZ(currentDate) === ymdInTZ(new Date()),
    [currentDate]
  );

  // Actualizar handleDrawerOpen para usar horasNormales y horasRestantesDia
  const handleDrawerOpenWithHours = React.useCallback(async () => {
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
      // Pasar horaExtra=true explícitamente para evitar problemas de timing
      await loadJobs(true);
    } else {
      await loadJobs();
    }
  }, [horasNormales, horasRestantesDia, loadJobs]);

  // Efectos adicionales
  React.useEffect(() => {
    if (horasCero) {
      setDayConfigData((prev) => {
        if (!prev.esHoraCorrida) return prev;
        return { ...prev, esHoraCorrida: false };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horasCero, dayConfigData.horaEntrada, dayConfigData.horaSalida]);

  React.useEffect(() => {
    if (horarioValidado?.tipoHorario !== "H2_1") return;
    setDayConfigData((prev) => {
      if (prev.esDiaLibre) {
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

  React.useEffect(() => {
    setFormData((prev) => {
      if (!prev.horaInicio || !prev.horaFin) return prev;
      const v = computeHorasInvertidasWrapper(
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
    computeHorasInvertidasWrapper,
  ]);

  React.useEffect(() => {
    const { horaInicio, horaFin, horaExtra } = formData;
    if (horaInicio && horaFin) {
      const v = computeHorasInvertidasWrapper(horaInicio, horaFin, horaExtra);
      setFormData((prev) => ({ ...prev, horasInvertidas: v }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.horaInicio, formData.horaFin, computeHorasInvertidasWrapper]);

  React.useEffect(() => {
    if (shouldForceExtra && drawerOpen) {
      setFormData((prev) => {
        let needsUpdate = false;
        let newFormData = prev;

        if (isProgressComplete && !prev.horaExtra) {
          newFormData = {
            ...prev,
            horaExtra: true,
            horasInvertidas: "",
            horaInicio: "",
            horaFin: "",
            job: "",
          };
          needsUpdate = true;
        } else if (isProgressIncomplete && prev.horaExtra) {
          newFormData = {
            ...prev,
            horaExtra: false,
            horasInvertidas: "",
            horaInicio: "",
            horaFin: "",
            job: "",
          };
          needsUpdate = true;
        }

        if (needsUpdate && newFormData.horaExtra !== prev.horaExtra) {
          setSelectedJob(null);
          // Pasar el nuevo valor de horaExtra explícitamente para evitar problemas de timing
          setTimeout(() => {
            loadJobs(newFormData.horaExtra);
          }, 0);
        }

        return newFormData;
      });
    }
  }, [
    shouldForceExtra,
    isProgressComplete,
    isProgressIncomplete,
    drawerOpen,
    loadJobs,
  ]);

  return {
    // Estados
    currentDate,
    drawerOpen,
    editingActivity,
    editingIndex,
    formData,
    formErrors,
    jobs,
    loadingJobs,
    selectedJob,
    registroDiario,
    dayConfigData,
    dayConfigErrors,
    loading,
    initialLoading,
    snackbar,
    horarioValidado,
    horarioData,
    readOnly,
    user,

    // Flags y valores calculados
    isH2,
    isH2_2,
    showDiaNoLaborable,
    isH1,
    isHoliday,
    workedHoursNormales,
    horasNormales,
    progressPercentage,
    horasFaltantesMessage,
    horasRestantesDia,
    editingHoursNormales,
    horasDisponiblesValidacionForm,
    canAddExtraHours,
    disableHoraCorrida,
    disableTimeFields,
    exceededNormalHours,
    hasExceededNormalHours,
    hasDayRecord,
    isIncapacidad,
    disableCreateEditActivities,
    dayConfigHasChanges,
    forceExtra,
    horasCero,
    shouldForceExtra,
    isProgressComplete,
    isProgressIncomplete,

    // Handlers
    handleDrawerOpen: handleDrawerOpenWithHours,
    handleDrawerClose,
    handleEditActivity,
    handleDeleteActivity,
    handleDayConfigTimeKeyDown,
    handleDayConfigInputChange,
    validateDayConfig,
    handleDayConfigSubmit,
    handleTimeKeyDown,
    handleInputChange,
    handleHorasBlur,
    handleJobChange,
    validateForm,
    handleSubmit,
    navigateDate,
    goToToday,
    isToday,

    // Funciones de utilidad
    computeHorasActividadForDisplayWrapper,
    formatTimeLocal,
    formatDate,
    timeToMinutes,
    minutesToHHMM,
    horarioRules,
    isMobile,

    // Setters para el UI
    setSnackbar,
  };
};
