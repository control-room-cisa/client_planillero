import api from "./api";

interface Job {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  empresaId: number | null;
  mostrarEmpresaId: number | null;
  activo: boolean;
  especial?: boolean;
  empresa?: {
    id: number;
    codigo: string | null;
    nombre: string;
    createdAt: string;
    updatedAt: string | null;
    deletedAt: string | null;
  };
}

interface JobsResponse {
  success: boolean;
  message: string;
  data: Job[];
}

interface JobResponse {
  success: boolean;
  message: string;
  data: Job;
}

interface CreateJobDto {
  nombre: string;
  codigo: string;
  descripcion: string;
  empresaId?: number | null;
  mostrarEmpresaId?: number | null;
  activo?: boolean;
  especial?: boolean;
}

interface UpdateJobDto {
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  empresaId?: number | null;
  mostrarEmpresaId?: number | null;
  activo?: boolean;
  especial?: boolean;
}

class JobService {
  static async getAll(empleadoId?: number): Promise<Job[]> {
    try {
      const params = empleadoId ? { empleadoId: empleadoId.toString() } : {};
      const response = await api.get<JobsResponse>("/jobs", { params });
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener jobs:", error);
      throw new Error("Error al cargar la lista de jobs");
    }
  }

  static async getById(id: number): Promise<Job> {
    try {
      const response = await api.get<JobResponse>(`/jobs/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error al obtener job ${id}:`, error);
      throw new Error("Error al cargar el job");
    }
  }

  static async create(jobData: CreateJobDto): Promise<Job> {
    try {
      const response = await api.post<JobResponse>("/jobs", jobData);
      return response.data.data;
    } catch (error: any) {
      console.error("Error al crear job:", error);

      // Extraer el mensaje de error del backend si está disponible
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Error al crear el job");
      }
    }
  }

  static async update(id: number, jobData: UpdateJobDto): Promise<Job> {
    try {
      const response = await api.put<JobResponse>(`/jobs/${id}`, jobData);
      return response.data.data;
    } catch (error: any) {
      console.error(`Error al actualizar job ${id}:`, error);

      // Extraer el mensaje de error del backend si está disponible
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Error al actualizar el job");
      }
    }
  }

  // El método toggleActive ya no es necesario, usamos update

  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/jobs/${id}`);
    } catch (error: any) {
      console.error(`Error al eliminar job ${id}:`, error);

      // Extraer el mensaje de error del backend si está disponible
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Error al eliminar el job");
      }
    }
  }
}

export default JobService;
export type { Job, CreateJobDto, UpdateJobDto };
