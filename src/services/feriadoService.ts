import api from "./api";

interface Feriado {
  id: number;
  fecha: string; // Formato "YYYY-MM-DD"
  nombre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

interface FeriadosResponse {
  success: boolean;
  message: string;
  data: Feriado[];
}

interface FeriadoResponse {
  success: boolean;
  message: string;
  data: Feriado;
}

interface CreateFeriadoDto {
  fecha: string; // Formato "YYYY-MM-DD"
  nombre: string;
  descripcion?: string;
}

interface UpdateFeriadoDto {
  fecha?: string;
  nombre?: string;
  descripcion?: string;
}

class FeriadoService {
  static async getAll(): Promise<Feriado[]> {
    try {
      const response = await api.get<FeriadosResponse>("/feriados");
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener feriados:", error);
      throw new Error("Error al cargar la lista de feriados");
    }
  }

  static async getByDate(fecha: string): Promise<Feriado | null> {
    try {
      const response = await api.get<FeriadoResponse>(`/feriados/${fecha}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error al obtener feriado para fecha ${fecha}:`, error);
      throw new Error("Error al cargar el feriado");
    }
  }

  static async create(feriadoData: CreateFeriadoDto): Promise<Feriado> {
    try {
      const response = await api.post<FeriadoResponse>(
        "/feriados",
        feriadoData
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al crear feriado:", error);
      throw new Error("Error al crear el feriado");
    }
  }

  static async upsert(
    fecha: string,
    feriadoData: CreateFeriadoDto
  ): Promise<Feriado> {
    try {
      const response = await api.put<FeriadoResponse>(
        `/feriados/${fecha}`,
        feriadoData
      );
      return response.data.data;
    } catch (error) {
      console.error(
        `Error al actualizar/crear feriado para fecha ${fecha}:`,
        error
      );
      throw new Error("Error al actualizar/crear el feriado");
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/feriados/${id}`);
    } catch (error) {
      console.error(`Error al eliminar feriado ${id}:`, error);
      throw new Error("Error al eliminar el feriado");
    }
  }
}

export default FeriadoService;
export type { Feriado, CreateFeriadoDto, UpdateFeriadoDto };
