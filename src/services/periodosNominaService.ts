import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";
import type { PeriodosNominaConfig } from "../components/rrhh/gestion-empleados/calculo-nominas/utils/periodos";

export type PeriodosNominaConfigDto = PeriodosNominaConfig & {
  descripcionCortes: string;
};

export class PeriodosNominaService {
  static async getConfig(): Promise<PeriodosNominaConfigDto> {
    const res = await api.get<ApiResponse<PeriodosNominaConfigDto>>(
      "/periodos-nomina/config",
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || "Error al cargar cortes de quincena");
    }
    return res.data.data;
  }
}
