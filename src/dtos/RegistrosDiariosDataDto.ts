export interface RegistroDiarioData {
  id?: number;
  fecha?: string;
  horaEntrada: string; // ISO string
  horaSalida: string; // ISO string
  jornada?: string; // M, T, N (Mañana, Tarde, Noche)
  esDiaLibre?: boolean;
  esIncapacidad?: boolean;
  esHoraCorrida?: boolean;
  comentarioEmpleado?: string;
  aprobacionSupervisor?: boolean;
  aprobacionRrhh?: boolean;
  comentarioSupervisor?: string;
  comentarioRrhh?: string;
  empleadoId?: number;
  actividades?: ActividadData[];
  horasFeriado?: number; // Horas laborables asignadas a feriado cuando es día festivo
}

export interface ActividadData {
  id?: number;
  jobId: number;
  duracionHoras: number;
  esExtra: boolean;
  esCompensatorio?: boolean;
  className?: string | null; // Cambiado para permitir null
  descripcion: string;
  horaInicio: string;
  horaFin:    string;
  job?: {
    id: number;
    nombre: string;
    codigo: string;
    descripcion?: string;
  };
  esActividadDividida?: boolean;
  idActividadPadre?: string;
}

export interface UpsertRegistroDiarioParams {
  fecha: string; // YYYY-MM-DD
  horaEntrada: string; // ISO string
  horaSalida: string; // ISO string
  jornada?: string;
  esDiaLibre?: boolean;
  esIncapacidad?: boolean;
  esHoraCorrida?: boolean;
  comentarioEmpleado?: string;
  horasFeriado?: number; // Horas laborables asignadas a feriado cuando es día festivo
  actividades?: {
    jobId: number;
    duracionHoras: number;
    esExtra?: boolean;
    esCompensatorio?: boolean;
    className?: string | null; // Cambiado para permitir null
    descripcion: string;
    horaInicio: string;
    horaFin:    string;
  }[];
}
