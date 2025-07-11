export interface Job {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Actividad {
  id: number;
  descripcion: string;
  duracionHoras: number;
  job: Job;
}

export interface RegistroDiario {
  id: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  comentarioEmpleado: string;
  comentarioSupervisor: string | null;
  actividades: Actividad[];
}

export interface EmpleadoBasic {
  id: number;
  nombre: string;
  apellido: string;
  codigo: string;
}

export interface PlanillaDetalle {
  empleado: EmpleadoBasic;
  registrosDiarios: RegistroDiario[];
}
