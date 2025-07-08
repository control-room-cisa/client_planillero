import api from './api';

export interface ActividadData {
  id?: number;
  jobId: number;
  duracionHoras: number;
  esExtra: boolean;
  className?: string;
  descripcion: string;
  job?: {
    id: number;
    nombre: string;
    codigo: string;
    descripcion?: string;
  };
}

export interface RegistroDiarioData {
  id?: number;
  horaEntrada: string; // ISO string
  horaSalida: string; // ISO string
  jornada?: string; // M, T, N (Mañana, Tarde, Noche)
  esDiaLibre?: boolean;
  comentarioEmpleado?: string;
  aprobacionSupervisor?: string;
  aprobacionRrhh?: string;
  comentarioSupervisor?: string;
  comentarioRrhh?: string;
  empleadoId?: number;
  actividades?: ActividadData[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface UpsertRegistroDiarioParams {
  fecha: string; // YYYY-MM-DD
  horaEntrada: string; // ISO string
  horaSalida: string; // ISO string
  jornada?: string;
  esDiaLibre?: boolean;
  comentarioEmpleado?: string;
  actividades?: {
    jobId: number;
    duracionHoras: number;
    esExtra?: boolean;
    className?: string;
    descripcion: string;
  }[];
}

class RegistroDiarioService {
  
  /**
   * Obtener registro diario por fecha
   */
  static async getByDate(date: string): Promise<RegistroDiarioData | null> {
    try {
      const response = await api.get<ApiResponse<RegistroDiarioData | null>>(
        `/registrodiario?fecha=${date}`
      );
      return response.data.data;
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Crear o actualizar registro diario
   */
  static async upsert(params: UpsertRegistroDiarioParams): Promise<RegistroDiarioData> {
    const response = await api.post<ApiResponse<RegistroDiarioData>>(
      '/registrodiario',
      params
    );
    return response.data.data;
  }

  /**
   * Agregar actividad a un registro diario existente
   */
  static async addActividad(
    fecha: string,
    actividad: {
      jobId: number;
      duracionHoras: number;
      esExtra?: boolean;
      className?: string;
      descripcion: string;
    }
  ): Promise<RegistroDiarioData> {
    // Primero obtenemos el registro actual
    const registroActual = await this.getByDate(fecha);
    
    if (!registroActual) {
      throw new Error('No existe registro para esta fecha. Debe configurar primero los datos del día.');
    }

    // Convertimos las actividades existentes al formato esperado por la API
    const actividadesExistentes = (registroActual.actividades || []).map(act => ({
      jobId: act.jobId,
      duracionHoras: act.duracionHoras,
      esExtra: act.esExtra,
      className: act.className,
      descripcion: act.descripcion,
    }));
    
    // Actualizamos el registro
    const response = await api.post<ApiResponse<RegistroDiarioData>>(
      '/registrodiario',
      {
        fecha,
        horaEntrada: registroActual.horaEntrada,
        horaSalida: registroActual.horaSalida,
        jornada: registroActual.jornada,
        esDiaLibre: registroActual.esDiaLibre,
        comentarioEmpleado: registroActual.comentarioEmpleado,
        actividades: [...actividadesExistentes, actividad],
      }
    );
    
    return response.data.data;
  }
}

export default RegistroDiarioService; 