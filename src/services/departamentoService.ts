import type { ApiResponse } from "../dtos/apiResponseDto";
import { API_CONFIG } from "../config/api";

export interface Departamento {
  id: number;
  empresaId: number;
  nombre: string | null;
  codigo?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface CreateDepartamentoDto {
  empresaId: number;
  nombre: string;
  codigo?: string;
}

export interface UpdateDepartamentoDto {
  nombre?: string;
  codigo?: string;
}

class DepartamentoService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async list(empresaId: number): Promise<Departamento[]> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/departamentos?empresaId=${empresaId}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }

      const data: ApiResponse<Departamento[]> = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error al listar departamentos:", error);
      throw error;
    }
  }

  async getById(id: number): Promise<Departamento> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/departamentos/${id}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }

      const data: ApiResponse<Departamento> = await response.json();
      return data.data!;
    } catch (error) {
      console.error("Error al obtener departamento:", error);
      throw error;
    }
  }

  async create(departamentoData: CreateDepartamentoDto): Promise<Departamento> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/departamentos`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(departamentoData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }

      const data: ApiResponse<Departamento> = await response.json();
      return data.data!;
    } catch (error) {
      console.error("Error al crear departamento:", error);
      throw error;
    }
  }

  async update(
    id: number,
    departamentoData: UpdateDepartamentoDto
  ): Promise<Departamento> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/departamentos/${id}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(departamentoData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }

      const data: ApiResponse<Departamento> = await response.json();
      return data.data!;
    } catch (error) {
      console.error("Error al actualizar departamento:", error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/departamentos/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error al eliminar departamento:", error);
      throw error;
    }
  }
}

export default new DepartamentoService();

