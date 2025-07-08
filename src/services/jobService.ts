import type { JobsResponse } from '../types/job';
import { API_CONFIG } from '../config/api';

class JobService {
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

  async getJobs(): Promise<JobsResponse> {
    try {
      console.log('Obteniendo lista de jobs...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOBS.LIST}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
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

      const data: JobsResponse = await response.json();
      console.log('Jobs obtenidos:', data);
      
      return data;
    } catch (error) {
      console.error('Error al obtener jobs:', error);
      throw error;
    }
  }
}

export const jobService = new JobService(); 