import api from "./api";

interface Vehiculo {
  id: number;
  class: number;
  nombre: string;
  tipo?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

interface VehiculosResponse {
  success: boolean;
  message: string;
  data: Vehiculo[];
}

class VehiculoService {
  static async getAll(): Promise<Vehiculo[]> {
    try {
      const response = await api.get<VehiculosResponse>("/vehiculos");
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener vehiculos:", error);
      throw new Error("Error al cargar la lista de vehiculos");
    }
  }
}

export default VehiculoService;
export type { Vehiculo };
