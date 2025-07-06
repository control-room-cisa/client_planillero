import type { EmpresasResponse } from '../types/auth';
import { API_CONFIG } from '../config/api';

class EmpresaService {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async getEmpresas(): Promise<EmpresasResponse> {
    try {
      console.log('Obteniendo empresas...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPRESAS.LIST}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error del servidor:', errorData);
        
        if (errorData?.message) {
          throw new Error(errorData.message);
        } else {
          throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
      }

      const data: EmpresasResponse = await response.json();
      console.log('Empresas obtenidas:', data);
      
      return data;
    } catch (error) {
      console.error('Error al obtener empresas:', error);
      throw error;
    }
  }
}

export const empresaService = new EmpresaService(); 