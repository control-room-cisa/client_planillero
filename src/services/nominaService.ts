// src/services/nominaService.ts
import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";
import type {
  NominaDto,
  CrearNominaDto,
  ActualizarNominaDto,
} from "../dtos/nominaDto";

interface NominasResponse extends ApiResponse<NominaDto[]> {}
interface NominaResponse extends ApiResponse<NominaDto> {}

class NominaService {
  static async list(params?: {
    empleadoId?: number;
    empresaId?: number;
    start?: string;
    end?: string;
  }): Promise<NominaDto[]> {
    const response = await api.get<NominasResponse>("/nominas", { params });
    return response.data.data || [];
  }

  static async create(payload: CrearNominaDto): Promise<NominaDto> {
    const response = await api.post<NominaResponse>("/nominas", payload);
    return response.data.data;
  }

  static async update(id: number, payload: ActualizarNominaDto): Promise<NominaDto> {
    const response = await api.put<NominaResponse>(`/nominas/${id}`, payload);
    return response.data.data;
  }
}

export default NominaService;
export type { NominaDto, CrearNominaDto, ActualizarNominaDto };


