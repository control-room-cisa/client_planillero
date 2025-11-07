import api from "./api";
import type { Empleado } from "./empleadoService";

interface PlanillaAccesoRevision {
  id: number;
  supervisorId: number;
  empleadoId: number;
  supervisor?: Empleado; // Opcional porque las respuestas de create/update pueden no incluirlo
  empleado?: Empleado; // Opcional porque las respuestas de create/update pueden no incluirlo
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

interface PlanillaAccesoRevisionResponse {
  success: boolean;
  message: string;
  data: PlanillaAccesoRevision;
}

interface PlanillaAccesoRevisionListResponse {
  success: boolean;
  message: string;
  data: PlanillaAccesoRevision[];
}

interface CreatePlanillaAccesoRevisionDto {
  supervisorId: number;
  empleadoId: number;
}

interface UpdatePlanillaAccesoRevisionDto {
  supervisorId?: number;
  empleadoId?: number;
}

interface PlanillaAccesoRevisionFilters {
  supervisorId?: number;
  empleadoId?: number;
}

class PlanillaAccesoRevisionService {
  static async getAll(
    filters?: PlanillaAccesoRevisionFilters
  ): Promise<PlanillaAccesoRevision[]> {
    try {
      const params: Record<string, string> = {};
      if (filters?.supervisorId) {
        params.supervisorId = filters.supervisorId.toString();
      }
      if (filters?.empleadoId) {
        params.empleadoId = filters.empleadoId.toString();
      }

      const response = await api.get<PlanillaAccesoRevisionListResponse>(
        "/planilla-acceso-revision",
        { params }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener accesos de planilla:", error);
      throw new Error("Error al cargar la lista de accesos de planilla");
    }
  }

  static async getById(id: number): Promise<PlanillaAccesoRevision> {
    try {
      const response = await api.get<PlanillaAccesoRevisionResponse>(
        `/planilla-acceso-revision/${id}`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error al obtener acceso de planilla ${id}:`, error);
      throw new Error("Error al cargar el acceso de planilla");
    }
  }

  static async create(
    data: CreatePlanillaAccesoRevisionDto
  ): Promise<PlanillaAccesoRevision> {
    try {
      const response = await api.post<PlanillaAccesoRevisionResponse>(
        "/planilla-acceso-revision",
        data
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error al crear acceso de planilla:", error);
      const errorMessage =
        error.response?.data?.message || "Error al crear el acceso de planilla";
      throw new Error(errorMessage);
    }
  }

  static async update(
    id: number,
    data: UpdatePlanillaAccesoRevisionDto
  ): Promise<PlanillaAccesoRevision> {
    try {
      const response = await api.put<PlanillaAccesoRevisionResponse>(
        `/planilla-acceso-revision/${id}`,
        data
      );
      return response.data.data;
    } catch (error: any) {
      console.error(`Error al actualizar acceso de planilla ${id}:`, error);
      const errorMessage =
        error.response?.data?.message ||
        "Error al actualizar el acceso de planilla";
      throw new Error(errorMessage);
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/planilla-acceso-revision/${id}`);
    } catch (error) {
      console.error(`Error al eliminar acceso de planilla ${id}:`, error);
      throw new Error("Error al eliminar el acceso de planilla");
    }
  }
}

export default PlanillaAccesoRevisionService;
export type {
  PlanillaAccesoRevision,
  CreatePlanillaAccesoRevisionDto,
  UpdatePlanillaAccesoRevisionDto,
  PlanillaAccesoRevisionFilters,
};

