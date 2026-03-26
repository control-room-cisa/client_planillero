import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export type GlobalConfigDto = {
  key: string;
  value: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export class GlobalConfigService {
  static async list(): Promise<GlobalConfigDto[]> {
    const res = await api.get<ApiResponse<GlobalConfigDto[]>>("/global-config");
    return res.data.data ?? [];
  }

  static async get(key: string): Promise<GlobalConfigDto | null> {
    const res = await api.get<ApiResponse<GlobalConfigDto | null>>(
      `/global-config/${encodeURIComponent(key)}`
    );
    return res.data.data ?? null;
  }

  static async upsert(payload: {
    key: string;
    value: string;
    description?: string | null;
  }): Promise<GlobalConfigDto> {
    const res = await api.post<ApiResponse<GlobalConfigDto>>(
      "/global-config",
      payload
    );
    if (!res.data.success) throw new Error(res.data.message || "Error guardando");
    return res.data.data!;
  }

  static async delete(key: string): Promise<void> {
    const res = await api.delete<ApiResponse<null>>(
      `/global-config/${encodeURIComponent(key)}`
    );
    if (!res.data.success) throw new Error(res.data.message || "Error eliminando");
  }
}

