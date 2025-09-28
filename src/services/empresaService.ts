import type { EmpresasResponse, Empresa } from "../types/auth";
import { API_CONFIG } from "../config/api";

class EmpresaService {
  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
    };
  }

  async getEmpresas(): Promise<EmpresasResponse> {
    try {
      console.log("Obteniendo empresas...");

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPRESAS.LIST}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      console.log(
        "Respuesta del servidor:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Error del servidor:", errorData);

        if (errorData?.message) {
          throw new Error(errorData.message);
        } else {
          throw new Error(
            `Error del servidor: ${response.status} ${response.statusText}`
          );
        }
      }

      const data: EmpresasResponse = await response.json();
      console.log("Empresas obtenidas:", data);

      return data;
    } catch (error) {
      console.error("Error al obtener empresas:", error);
      throw error;
    }
  }

  async createEmpresa(empresaData: {
    nombre: string;
    codigo: string;
    esConsorcio?: boolean;
  }): Promise<Empresa> {
    try {
      console.log("Creando empresa:", empresaData);

      const response = await fetch(`${API_CONFIG.BASE_URL}/empresas`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(empresaData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error al crear empresa:", error);
      throw error;
    }
  }

  async updateEmpresa(
    id: number,
    empresaData: { nombre: string; codigo: string }
  ): Promise<Empresa> {
    try {
      console.log("Actualizando empresa:", id, empresaData);

      const response = await fetch(`${API_CONFIG.BASE_URL}/empresas/${id}`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(empresaData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Error del servidor: ${response.status}`
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error al actualizar empresa:", error);
      throw error;
    }
  }

  async deleteEmpresa(id: number): Promise<void> {
    try {
      console.log("Eliminando empresa:", id);

      const response = await fetch(`${API_CONFIG.BASE_URL}/empresas/${id}`, {
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
      console.error("Error al eliminar empresa:", error);
      throw error;
    }
  }
}

export const empresaService = new EmpresaService();
