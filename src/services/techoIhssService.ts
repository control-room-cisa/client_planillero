import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export type TechoIhssDto = {
  id: number;
  createdAt: string;
  fechaInicio: string;
  fechaFin: string;
  monto: number;
};

export type TechoIhssPayload = {
  fechaInicio: string;
  fechaFin: string;
  monto: number;
};

export type TechoIhssListResult = {
  items: TechoIhssDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const TECHO_IHSS_PAGE_SIZE = 20;

export class TechoIhssService {
  static async list(page = 0): Promise<TechoIhssListResult> {
    const res = await api.get<ApiResponse<TechoIhssListResult>>("/techo-ihss", {
      params: { page },
    });
    if (!res.data.success)
      throw new Error(res.data.message || "Error al listar techos IHSS");
    return (
      res.data.data ?? {
        items: [],
        total: 0,
        page: 0,
        pageSize: TECHO_IHSS_PAGE_SIZE,
        totalPages: 0,
      }
    );
  }

  static async create(payload: TechoIhssPayload): Promise<TechoIhssDto> {
    const res = await api.post<ApiResponse<TechoIhssDto>>(
      "/techo-ihss",
      payload,
    );
    if (!res.data.success)
      throw new Error(res.data.message || "Error al crear techo IHSS");
    if (!res.data.data) throw new Error("Respuesta inválida");
    return res.data.data;
  }

  static async update(
    id: number,
    payload: TechoIhssPayload,
  ): Promise<TechoIhssDto> {
    const res = await api.put<ApiResponse<TechoIhssDto>>(
      `/techo-ihss/${id}`,
      payload,
    );
    if (!res.data.success)
      throw new Error(res.data.message || "Error al actualizar techo IHSS");
    if (!res.data.data) throw new Error("Respuesta inválida");
    return res.data.data;
  }

  static async delete(id: number): Promise<void> {
    const res = await api.delete<ApiResponse<null>>(`/techo-ihss/${id}`);
    if (!res.data.success)
      throw new Error(res.data.message || "Error al eliminar techo IHSS");
  }
}
