import type { ApiResponse } from "../dtos/apiResponseDto";
import type {
  RegistroDiarioData,
  UpsertRegistroDiarioParams,
} from "../dtos/RegistrosDiariosDataDto";
import api from "./api";

class RegistroDiarioService {
  /**
   * Obtener registro diario por fecha
   */
  static async getByDate(
    date: string,
    idEmpleado?: number
  ): Promise<RegistroDiarioData | null> {
    try {
      const response = await api.get<ApiResponse<RegistroDiarioData | null>>(
        "/registrodiario",
        {
          params: {
            fecha: date,
            ...(idEmpleado != null ? { idEmpleado } : {}),
          },
        }
      );
      return response.data.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Crear o actualizar registro diario
   */
  static async upsert(
    params: UpsertRegistroDiarioParams
  ): Promise<RegistroDiarioData> {
    const response = await api.post<ApiResponse<RegistroDiarioData>>(
      "/registrodiario",
      params
    );
    console.log("Registro diario con hora inicio:", response.data.data);

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
      throw new Error(
        "No existe registro para esta fecha. Debe configurar primero los datos del día."
      );
    }

    // Convertimos las actividades existentes al formato esperado por la API
    const actividadesExistentes = (registroActual.actividades || []).map(
      (act) => ({
        jobId: act.jobId,
        duracionHoras: act.duracionHoras,
        esExtra: act.esExtra,
        className: act.className,
        descripcion: act.descripcion,
      })
    );

    // Actualizamos el registro
    const response = await api.post<ApiResponse<RegistroDiarioData>>(
      "/registrodiario",
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

  static async aprobarSupervisor(
    registroId: number,
    aprobacion: boolean,
    codigoSupervisor?: string,
    comentarioSupervisor?: string
  ): Promise<RegistroDiarioData> {
    const payload = {
      aprobacionSupervisor: aprobacion,
      ...(codigoSupervisor !== undefined && { codigoSupervisor }),
      ...(comentarioSupervisor !== undefined && { comentarioSupervisor }),
    };
    const response = await api.patch<ApiResponse<RegistroDiarioData>>(
      `/registrodiario/aprobacion-supervisor/${registroId}`,
      payload
    );
    return response.data.data;
  }

  static async aprobarRrhh(
    registroId: number,
    aprobacion: boolean,
    codigoRrhh?: string,
    comentarioRrhh?: string
  ): Promise<RegistroDiarioData> {
    const payload = {
      aprobacionRrhh: aprobacion,
      ...(codigoRrhh !== undefined && { codigoRrhh }),
      ...(comentarioRrhh !== undefined && { comentarioRrhh }),
    };
    const response = await api.patch<ApiResponse<RegistroDiarioData>>(
      `/registrodiario/aprobacion-rrhh/${registroId}`,
      payload
    );
    return response.data.data;
  }

  // Metodo para actualizar job de un empleado por el supervisor
  static async upsertForEmpleado(
    empleadoId: number,
    params: UpsertRegistroDiarioParams
  ): Promise<RegistroDiarioData> {
    const response = await api.post<ApiResponse<RegistroDiarioData>>(
      "/registrodiario",
      params,
      { params: { empleadoId } } // <- indica a qué empleado aplicará el upsert
    );
    return response.data.data;
  }
}

export default RegistroDiarioService;
