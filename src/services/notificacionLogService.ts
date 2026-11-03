import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export type NotificacionEmpleado = {
  id: number;
  codigo: string | null;
  nombre: string;
  apellido: string | null;
};

export type NotificacionLog = {
  id: number;
  categoria: string;
  descripcion: string;
  leida: boolean;
  leidaAt: string | null;
  metadata: unknown;
  createdAt: string | null;
  destinatario: NotificacionEmpleado;
  actor: NotificacionEmpleado | null;
};

export type PaginatedNotificaciones = {
  items: NotificacionLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const base = "/notificaciones";

export class NotificacionLogService {
  static async listMias(
    page = 1,
    limit = 20,
    options?: { soloNoLeidas?: boolean; categoria?: string }
  ): Promise<PaginatedNotificaciones> {
    const response = await api.get<ApiResponse<PaginatedNotificaciones>>(
      `${base}/mias`,
      {
        params: {
          page,
          limit,
          ...(options?.soloNoLeidas ? { soloNoLeidas: true } : {}),
          ...(options?.categoria ? { categoria: options.categoria } : {}),
        },
      }
    );
    return response.data.data!;
  }

  static async countPendientes(): Promise<number> {
    const response = await api.get<ApiResponse<{ count: number }>>(
      `${base}/mias/pendientes`
    );
    return response.data.data?.count ?? 0;
  }

  static async marcarLeida(id: number): Promise<NotificacionLog> {
    const response = await api.patch<ApiResponse<NotificacionLog>>(
      `${base}/mias/${id}/leida`
    );
    return response.data.data!;
  }
}
