export interface Actividad {
  jobId: number;
  duracionHoras: number;
  esExtra: boolean;
  className?: string;
  descripcion: string;
}

export interface RegistroDiarioRequest {
  fecha: string; // YYYY-MM-DD
  horaEntrada: string; // ISO string
  horaSalida: string; // ISO string
  jornada: 'M' | 'T' | 'N'; // Mañana, Tarde, Noche
  esDiaLibre: boolean;
  comentarioEmpleado?: string;
  aprobacionSupervisor?: string;
  comentarioSupervisor?: string;
  actividades: Actividad[];
}

export interface RegistroDiarioResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    fecha: string;
    horaEntrada: string;
    horaSalida: string;
    jornada: string;
    esDiaLibre: boolean;
    comentarioEmpleado: string | null;
    aprobacionSupervisor: string | null;
    comentarioSupervisor: string | null;
    empleadoId: number;
    createdAt: string;
    updatedAt: string | null;
    actividades: {
      id: number;
      jobId: number;
      duracionHoras: number;
      esExtra: boolean;
      className: string | null;
      descripcion: string;
    }[];
  };
}

// Tipos para el formulario del frontend
export interface ActivityFormData {
  descripcion: string;
  horasInvertidas: string;
  job: string;
  class: string;
  horaExtra: boolean;
} 