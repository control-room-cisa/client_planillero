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
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

export const RANGOS_ALIMENTACION_PAGE_SIZE = 20;

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

  static async list(
    page = 0,
  ): Promise<Required<
    Pick<
      ListRangosFechasAlimentacionResult,
      "items" | "total" | "page" | "pageSize" | "totalPages" | "idPermiteEdicion"
    >
  >> {
    const res = await api.get<ApiResponse<ListRangosFechasAlimentacionResult>>(
      "/rangos-fechas-alimentacion",
      { params: { page } },
    );
    if (!res.data.success)
      throw new Error(res.data.message || "Error al listar rangos");
    return {
      items: res.data.data?.items ?? [],
      idPermiteEdicion: res.data.data?.idPermiteEdicion ?? null,
      total: res.data.data?.total ?? 0,
      page: res.data.data?.page ?? 0,
      pageSize: res.data.data?.pageSize ?? RANGOS_ALIMENTACION_PAGE_SIZE,
      totalPages: res.data.data?.totalPages ?? 0,
    };
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
