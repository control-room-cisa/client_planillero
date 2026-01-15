export interface LoginRequest {
  correoElectronico: string;
  contrasena: string;
}

export interface Departamento {
  id: number;
  empresaId: number;
  nombre: string;
  codigo: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface Empresa {
  id: number;
  codigo: string;
  nombre: string;
  esConsorcio?: boolean;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  departamentos: Departamento[];
}

export interface EmpresasResponse {
  success: boolean;
  message: string;
  data: Empresa[];
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  correoElectronico: string;
  contrasena: string;
  empresaId: number;
  departamentoId: number;
}

export interface Empleado {
  id: number;
  codigo?: string;
  nombre: string;
  apellido: string;
  correoElectronico: string;
  departamentoId: number;
  rolId: number;
  horasDiariasTrabajadas?: number | null;
  dni?: string | null;
  editTime?: string | null; // Fecha/hora hasta la cual el empleado puede editar registros fuera del rango normal
  createdAt?: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface Employee {
  id: number;
  nombre: string;
  apellido: string | undefined;
  codigo?: string;
  departamento: string;
  empresaId?: number;
}

export interface EmployeesResponse {
  success: boolean;
  message: string;
  data: Employee[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    empleado: Empleado;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: Empleado;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Empleado | null;
  token: string | null;
  loading: boolean;
}

export interface ChangePasswordRequest {
  usuario?: string;
  correoElectronico?: string;
  dni?: string;
  contrasenaActual: string;
  nuevaContrasena: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  data: null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (registerData: RegisterRequest) => Promise<void>;
  logout: () => void;
}
