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

export type ProrrateoGuardadoResumen = {
  nominaId: number;
  nombrePeriodoNomina: string | null;
  fechaInicio: string;
  fechaFin: string;
  codigoNomina: string | null;
  cantidadFilas: number;
};

export type ProrrateoFilaDto = {
  id: number;
  jobId: number | null;
  codigoJob: string | null;
  codigoClass: string | null;
  cantidadHoras: number;
  monto: number;
  tipo: string;
};

export type ProrrateoGuardadoDetalle = {
  nominaId: number;
  empleadoId: number;
  nombrePeriodoNomina: string | null;
  fechaInicio: string;
  fechaFin: string;
  codigoNomina: string | null;
  filas: ProrrateoFilaDto[];
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

  static async listarGuardadosPorEmpleado(
    empleadoId: number
  ): Promise<ProrrateoGuardadoResumen[]> {
    const response = await api.get<ApiResponse<ProrrateoGuardadoResumen[]>>(
      `/prorrateos/empleado/${empleadoId}`
    );
    return response.data.data || [];
  }

  static async obtenerPorNomina(
    nominaId: number
  ): Promise<ProrrateoGuardadoDetalle> {
    const response = await api.get<ApiResponse<ProrrateoGuardadoDetalle>>(
      `/prorrateos/nomina/${nominaId}`
    );
    return response.data.data;
  }

  static async downloadExcel(
    empresaId: number,
    codigoNomina: string
  ): Promise<Blob> {
    const response = await api.get("/prorrateos/excel", {
      params: { empresaId, codigoNomina },
      responseType: "blob",
    });
    return response.data;
  }
}

export default ProrrateoService;
