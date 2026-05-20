import api from "./api";

export interface AccesoContabilidadCatalogEmpleado {
  id: number;
  nombre: string;
  apellido: string | null;
  codigo: string | null;
  departamento?: {
    nombre: string | null;
    empresa: { id: number; nombre: string | null } | null;
  } | null;
}

export interface AccesoContabilidadCatalogEmpresa {
  id: number;
  nombre: string | null;
  codigo: string | null;
  esConsorcio?: boolean | null;
}

export interface AccesoContabilidad {
  id: number;
  empleadoId: number;
  empresaId: number;
  createdBy: number;
  createdAt: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
  deletedAt: string | null;
  empleado?: AccesoContabilidadCatalogEmpleado;
  empresa?: AccesoContabilidadCatalogEmpresa;
  creadoPor?: {
    id: number;
    nombre: string;
    apellido: string | null;
    codigo: string | null;
  };
}

export interface CreateAccesoContabilidadDto {
  empleadoId: number;
  empresaId: number;
}

interface ApiList<T> {
  success: boolean;
  message: string;
  data: T;
}

class AccesoContabilidadService {
  static async getCatalogos(): Promise<{
    empleados: AccesoContabilidadCatalogEmpleado[];
    empresas: AccesoContabilidadCatalogEmpresa[];
  }> {
    const response = await api.get<
      ApiList<{
        empleados: AccesoContabilidadCatalogEmpleado[];
        empresas: AccesoContabilidadCatalogEmpresa[];
      }>
    >("/accesos-contabilidad/catalogos");
    return response.data.data;
  }

  static async getAll(): Promise<AccesoContabilidad[]> {
    const response = await api.get<ApiList<AccesoContabilidad[]>>(
      "/accesos-contabilidad"
    );
    return response.data.data;
  }

  static async getById(id: number): Promise<AccesoContabilidad> {
    const response = await api.get<ApiList<AccesoContabilidad>>(
      `/accesos-contabilidad/${id}`
    );
    return response.data.data;
  }

  static async create(data: CreateAccesoContabilidadDto): Promise<AccesoContabilidad> {
    const response = await api.post<ApiList<AccesoContabilidad>>(
      "/accesos-contabilidad",
      data
    );
    return response.data.data;
  }

  static async update(
    id: number,
    data: CreateAccesoContabilidadDto
  ): Promise<AccesoContabilidad> {
    const response = await api.put<ApiList<AccesoContabilidad>>(
      `/accesos-contabilidad/${id}`,
      data
    );
    return response.data.data;
  }

  static async delete(id: number): Promise<void> {
    await api.delete(`/accesos-contabilidad/${id}`);
  }
}

export default AccesoContabilidadService;
