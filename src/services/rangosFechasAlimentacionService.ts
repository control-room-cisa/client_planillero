import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export type RangoFechasAlimentacionDto = {
  id: number;
  codigoNomina: string;
  fechaInicio: string;
  fechaFin: string;
};

export type ListRangosFechasAlimentacionResult = {
  items: RangoFechasAlimentacionDto[];
  idPermiteEdicion: number | null;
};

export class RangosFechasAlimentacionService {
  static async listByCodigo(
    codigoNomina: string,
  ): Promise<ListRangosFechasAlimentacionResult> {
    const res = await api.get<ApiResponse<ListRangosFechasAlimentacionResult>>(
      "/rangos-fechas-alimentacion",
      { params: { codigoNomina } },
    );
    if (!res.data.success)
      throw new Error(res.data.message || "Error al listar rangos");
    if (!res.data.data) throw new Error("Respuesta inválida");
    return res.data.data;
  }

  static async create(payload: {
    codigoNomina: string;
    fechaInicio: string;
    fechaFin: string;
  }): Promise<RangoFechasAlimentacionDto> {
    const res = await api.post<ApiResponse<RangoFechasAlimentacionDto>>(
      "/rangos-fechas-alimentacion",
      payload,
    );
    if (!res.data.success) throw new Error(res.data.message || "Error al crear");
    if (!res.data.data) throw new Error("Respuesta inválida");
    return res.data.data;
  }

  static async update(
    id: number,
    payload: { fechaInicio: string; fechaFin: string },
  ): Promise<RangoFechasAlimentacionDto> {
    const res = await api.put<ApiResponse<RangoFechasAlimentacionDto>>(
      `/rangos-fechas-alimentacion/${id}`,
      payload,
    );
    if (!res.data.success)
      throw new Error(res.data.message || "Error al actualizar");
    if (!res.data.data) throw new Error("Respuesta inválida");
    return res.data.data;
  }
}
