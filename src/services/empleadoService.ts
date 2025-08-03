import api from "./api";

interface Empleado {
  id: number;
  nombre: string;
  apellido?: string;
  codigo?: string;
  departamento?: string;
  empresaId?: number;
  urlFotoPerfil?: string;
  urlCv?: string;
  correoElectronico?: string;
  dni?: string;
  profesion?: string;
  cargo?: string;
  sueldoMensual?: number;
  telefono?: string;
  direccion?: string;
  activo?: boolean;
  rolId?: number;
  departamentoId?: number;
  // Campos adicionales que pueden venir del backend
  nombreUsuario?: string;
  tipoHorario?: string;
  estadoCivil?: string;
  nombreConyugue?: string;
  tipoContrato?: string;
  condicionSalud?: string;
  nombreContactoEmergencia?: string;
  numeroContactoEmergencia?: string;
  banco?: string;
  tipoCuenta?:
    | "AHORROS_MONEDA_NACIONAL"
    | "AHORROS_MONEDA_EXTRANJERA"
    | "CHEQUES_MONEDA_NACIONAL"
    | "CHEQUES_MONEDA_EXTRANJERA";
  numeroCuenta?: string;
  muerteBeneficiario?: string;
  nombreMadre?: string;
  nombrePadre?: string;
  fechaInicioIngreso?: string;
  // Campos adicionales del DTO completo
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

interface EmpleadosResponse {
  success: boolean;
  message: string;
  data: Empleado[];
}

interface EmpleadoResponse {
  success: boolean;
  message: string;
  data: Empleado;
}

interface CreateEmpleadoDto {
  urlFotoPerfil: string | undefined;
  codigo: string;
  departamento: string;
  urlCv: any;
  nombre: string;
  apellido?: string;
  correoElectronico: string;
  dni?: string;
  profesion?: string;
  cargo?: string;
  sueldoMensual?: number;
  telefono?: string;
  direccion?: string;
  contrasena?: string;
  rolId: number;
  departamentoId: number;
  activo?: boolean;
  // Campos adicionales
  nombreUsuario?: string;
  tipoHorario?: string;
  estadoCivil?: string;
  nombreConyugue?: string;
  tipoContrato?: string;
  condicionSalud?: string;
  nombreContactoEmergencia?: string;
  numeroContactoEmergencia?: string;
  banco?: string;
  tipoCuenta?:
    | "AHORROS_MONEDA_NACIONAL"
    | "AHORROS_MONEDA_EXTRANJERA"
    | "CHEQUES_MONEDA_NACIONAL"
    | "CHEQUES_MONEDA_EXTRANJERA";
  numeroCuenta?: string;
  muerteBeneficiario?: string;
  nombreMadre?: string;
  nombrePadre?: string;
  fechaInicioIngreso?: Date;
}

interface UpdateEmpleadoDto {
  id: number;
  nombre?: string;
  apellido?: string;
  correoElectronico?: string;
  dni?: string;
  profesion?: string;
  cargo?: string;
  sueldoMensual?: number;
  telefono?: string;
  direccion?: string;
  rolId?: number;
  departamentoId?: number;
  activo?: boolean;
  // Campos adicionales
  nombreUsuario?: string;
  tipoHorario?: string;
  estadoCivil?: string;
  nombreConyugue?: string;
  tipoContrato?: string;
  condicionSalud?: string;
  nombreContactoEmergencia?: string;
  numeroContactoEmergencia?: string;
  banco?: string;
  tipoCuenta?:
    | "AHORROS_MONEDA_NACIONAL"
    | "AHORROS_MONEDA_EXTRANJERA"
    | "CHEQUES_MONEDA_NACIONAL"
    | "CHEQUES_MONEDA_EXTRANJERA";
  numeroCuenta?: string;
  muerteBeneficiario?: string;
  nombreMadre?: string;
  nombrePadre?: string;
  fechaInicioIngreso?: Date;
  // Nota: contraseña no se incluye en actualizaciones por seguridad
}

class EmpleadoService {
  static async getAll(empresaId?: number): Promise<Empleado[]> {
    try {
      const params = empresaId ? { empresaId: empresaId.toString() } : {};
      const response = await api.get<EmpleadosResponse>("/empleados/empresa", {
        params,
      });
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener empleados:", error);
      throw new Error("Error al cargar la lista de empleados");
    }
  }

  static async getById(id: number): Promise<Empleado> {
    try {
      const response = await api.get<EmpleadoResponse>(`/empleados/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error al obtener empleado ${id}:`, error);
      throw new Error("Error al cargar el empleado");
    }
  }

  static async create(
    empleadoData: CreateEmpleadoDto,
    files?: { foto?: File; cv?: File }
  ): Promise<Empleado> {
    try {
      const formData = new FormData();

      // Agregar datos del empleado como JSON
      formData.append("empleado", JSON.stringify(empleadoData));

      // Agregar archivos si existen
      if (files?.foto) {
        formData.append("foto", files.foto);
      }
      if (files?.cv) {
        formData.append("cv", files.cv);
      }

      const response = await api.post<EmpleadoResponse>(
        "/empleados",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al crear empleado:", error);
      throw new Error("Error al crear el empleado");
    }
  }

  static async update(
    empleadoData: UpdateEmpleadoDto,
    files?: { foto?: File; cv?: File }
  ): Promise<Empleado> {
    try {
      const formData = new FormData();

      // Agregar datos del empleado como JSON
      formData.append("empleado", JSON.stringify(empleadoData));

      // Agregar archivos si existen
      if (files?.foto) {
        formData.append("foto", files.foto);
      }
      if (files?.cv) {
        formData.append("cv", files.cv);
      }

      const response = await api.patch<EmpleadoResponse>(
        "/empleados",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al actualizar empleado:", error);
      throw new Error("Error al actualizar el empleado");
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/empleados/${id}`);
    } catch (error) {
      console.error(`Error al eliminar empleado ${id}:`, error);
      throw new Error("Error al eliminar el empleado");
    }
  }
}

export default EmpleadoService;
export type { Empleado, CreateEmpleadoDto, UpdateEmpleadoDto };
