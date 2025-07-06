import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, Empleado } from '../types/auth';
import { API_CONFIG } from '../config/api';

class AuthService {
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

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Enviando credenciales:', credentials);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(credentials),
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

      const data: LoginResponse = await response.json();
      console.log('Datos recibidos:', data);
      
      if (data.success) {
        // Guardar token y datos del usuario en localStorage
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('userData', JSON.stringify(data.data.empleado));
      }

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async register(registerData: RegisterRequest): Promise<RegisterResponse> {
    try {
      console.log('Enviando datos de registro:', registerData);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(registerData),
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

      const data: RegisterResponse = await response.json();
      console.log('Datos recibidos:', data);
      
      return data;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }

  getStoredToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getStoredUser(): Empleado | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }
}

export const authService = new AuthService(); 