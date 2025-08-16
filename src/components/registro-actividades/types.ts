/** Datos del formulario del Drawer (entrada en HH:mm) */
export interface ActivityData {
  descripcion: string;
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  horasInvertidas: string; // string para mostrar controlado en <TextField/>
  job: string; // id en string para integrarse con Autocomplete
  class: string;
  horaExtra: boolean;
}

/** Actividad en el registro (horas en ISO + metadatos) */
export interface Activity {
  id?: number;
  descripcion: string;
  horaInicio?: string; // ISO
  horaFin?: string; // ISO
  duracionHoras: number;
  jobId: number;
  className?: string | null;
  esExtra: boolean;
  job?: {
    nombre: string;
    codigo: string;
  };
}

/** Configuración de la jornada del día */
export interface DayConfigData {
  horaEntrada: string; // HH:mm
  horaSalida: string; // HH:mm
  jornada: "D" | "N" | "M";
  esDiaLibre: boolean;
  esHoraCorrida: boolean;
  comentarioEmpleado: string;
}

/** Estado del mensaje global */
export type SnackbarSeverity = "success" | "error";
export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

/** Resultado de validaciones/parametrización del horario desde la API */
export interface HorarioValidado {
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  esDiaLibre: boolean;
  esFestivo: boolean;
  nombreDiaFestivo: string;
  horasNormales: number;
  mostrarJornada: boolean;
  mostrarNombreFestivo: boolean;
}

/** Errores de formulario genérico (clave = nombre del campo) */
export type FormErrors = Record<string, string>;
