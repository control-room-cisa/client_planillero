import api from './api';

interface Job {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  empresaId: number;
  mostrarEmpresaId: number;
  empresa: {
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

class JobService {
  static async getAll(): Promise<Job[]> {
    try {
      const response = await api.get<JobsResponse>('/jobs');
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener jobs:', error);
      throw new Error('Error al cargar la lista de jobs');
    }
  }
}

export default JobService;
export type { Job }; 