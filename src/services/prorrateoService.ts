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

export type ResumenComentarioGuardarPayload = {
  jobId?: number | null;
  codigoJob?: string | null;
  nombreJob?: string | null;
  resumen: string;
};

export type GuardarProrrateoPayload = {
  nominaId: number;
  asignacionesCompensatoriasTomadas?: AsignacionCompensatoriaTomadaPayload[];
  resumenesComentarios?: ResumenComentarioGuardarPayload[];
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

export type ProrrateoComentarioResumenDto = {
  jobId: number | null;
  codigoJob: string | null;
  nombreJob: string | null;
  resumen: string;
};

export type ProrrateoGuardadoDetalle = {
  nominaId: number;
  empleadoId: number;
  nombrePeriodoNomina: string | null;
  fechaInicio: string;
  fechaFin: string;
  codigoNomina: string | null;
  filas: ProrrateoFilaDto[];
  resumenesComentarios?: ProrrateoComentarioResumenDto[];
};

export type ResumirComentariosPayload = {
  jobId?: number | null;
  codigoJob?: string | null;
  nombreJob?: string | null;
  comentarios: string[];
};

export type ResumirComentariosResult = {
  resumen: string;
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
      // Recálculo por colaborador al exportar; el timeout global (10s) no alcanza
      timeout: 300000,
    });
    return response.data;
  }

  static async resumirComentarios(
    payload: ResumirComentariosPayload
  ): Promise<ResumirComentariosResult> {
    const response = await api.post<ApiResponse<ResumirComentariosResult>>(
      "/prorrateos/resumen-comentarios",
      payload,
      { timeout: 60000 }
    );
    return response.data.data;
  }
}

export default ProrrateoService;
