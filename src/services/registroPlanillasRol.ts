import api from './api';
import { API_CONFIG } from '../config/api';
import type { PlanillaDetalle } from '../types/planilla';

export const planillaServiceRol = {
  async getPlanillasByEmpleadoAndRange(
    empleadoId: number,
    start: string,
    end: string
  ): Promise<PlanillaDetalle> {
    const url = API_CONFIG.ENDPOINTS.TIMESHEET.DETAIL(empleadoId, start, end);
    const response = await api.get(url);
    return response.data.data;
  },
};
