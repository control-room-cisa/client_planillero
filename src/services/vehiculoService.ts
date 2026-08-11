import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export interface Vehiculo {
  id: number;
  class: number;
  nombre: string;
  tipo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface CreateVehiculoDto {
  class: number;
  nombre: string;
  tipo?: string | null;
}

export interface UpdateVehiculoDto {
  class?: number;
  nombre?: string;
  tipo?: string | null;
}

class VehiculoService {
  static async getAll(): Promise<Vehiculo[]> {
    try {
      const response = await api.get<ApiResponse<Vehiculo[]>>("/vehiculos");
      return response.data.data || [];
    } catch (error) {
      console.error("Error al obtener vehiculos:", error);
      throw new Error("Error al cargar la lista de vehiculos");
    }
  }

  static async getById(id: number): Promise<Vehiculo> {
    try {
      const response = await api.get<ApiResponse<Vehiculo>>(`/vehiculos/${id}`);
      return response.data.data!;
    } catch (error: any) {
      console.error("Error al obtener vehiculo:", error);
      throw new Error(
        error?.response?.data?.message || "Error al obtener el vehículo"
      );
    }
  }

  static async create(data: CreateVehiculoDto): Promise<Vehiculo> {
    try {
      const response = await api.post<ApiResponse<Vehiculo>>("/vehiculos", data);
      return response.data.data!;
    } catch (error: any) {
      console.error("Error al crear vehiculo:", error);
      throw new Error(
        error?.response?.data?.message || "Error al crear el vehículo"
      );
    }
  }

  static async update(id: number, data: UpdateVehiculoDto): Promise<Vehiculo> {
    try {
      const response = await api.put<ApiResponse<Vehiculo>>(
        `/vehiculos/${id}`,
        data
      );
      return response.data.data!;
    } catch (error: any) {
      console.error("Error al actualizar vehiculo:", error);
      throw new Error(
        error?.response?.data?.message || "Error al actualizar el vehículo"
      );
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/vehiculos/${id}`);
    } catch (error: any) {
      console.error("Error al eliminar vehiculo:", error);
      throw new Error(
        error?.response?.data?.message || "Error al eliminar el vehículo"
      );
    }
  }
}

export default VehiculoService;
