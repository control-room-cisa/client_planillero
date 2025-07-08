export interface Job {
  id: number;
  nombre: string | null;
  codigo: string | null;
  descripcion: string | null;
  empresaId: number;
  mostrarEmpresaId: number;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface JobsResponse {
  success: boolean;
  message: string;
  data: Job[];
} 