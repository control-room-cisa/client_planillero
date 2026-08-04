// src/services/prorrateoService.ts
import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export type GuardarProrrateoResult = {
  cantidadFilas: number;
  nominaId: number;
};

export type EstadoProrrateo = {
  guardado: boolean;
  cantidadFilas: number;
};

export type AsignacionCompensatoriaTomadaPayload = {
  jobId: number | null;
  horas: number;
};

export type GuardarProrrateoPayload = {
  nominaId: number;
  asignacionesCompensatoriasTomadas?: AsignacionCompensatoriaTomadaPayload[];
};

class ProrrateoService {
  static async guardar(
    payload: GuardarProrrateoPayload
  ): Promise<GuardarProrrateoResult> {
    const response = await api.post<ApiResponse<GuardarProrrateoResult>>(
      "/prorrateos",
      payload
    );
    return response.data.data;
  }

  static async getEstado(nominaId: number): Promise<EstadoProrrateo> {
    const response = await api.get<ApiResponse<EstadoProrrateo>>(
      `/prorrateos/nomina/${nominaId}/estado`
    );
    return response.data.data;
  }
}

export default ProrrateoService;
