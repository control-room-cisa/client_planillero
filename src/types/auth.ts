export interface LoginRequest {
  correoElectronico: string;
  contrasena: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  correoElectronico: string;
  departamentoId: number;
  rolId: number;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    empleado: Empleado;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Empleado | null;
  token: string | null;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
} 