import type { RegistroDiarioRequest, RegistroDiarioResponse } from '../types/registroDiario';
import { API_CONFIG } from '../config/api';

class RegistroDiarioService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  async crearRegistro(registroData: RegistroDiarioRequest): Promise<RegistroDiarioResponse> {
    try {
      console.log('Enviando datos de registro diario:', registroData);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTRO_DIARIO.CREATE}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(registroData),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        // Intentar leer el mensaje de error del servidor
        const errorData = await response.json().catch(() => null);
        console.error('Error del servidor:', errorData);
        
        if (errorData?.message) {
          throw new Error(errorData.message);
        } else if (errorData?.errors) {
          // Si hay errores de validación específicos
          const validationErrors = errorData.errors.map((err: { field: string; message: string }) => `${err.field}: ${err.message}`).join(', ');
          throw new Error(`Errores de validación: ${validationErrors}`);
        } else {
          throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
      }

      const data: RegistroDiarioResponse = await response.json();
      console.log('Registro diario creado exitosamente:', data);
      
      return data;
    } catch (error) {
      console.error('Error al crear registro diario:', error);
      throw error;
    }
  }
}

export const registroDiarioService = new RegistroDiarioService(); 