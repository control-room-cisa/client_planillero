import { API_CONFIG } from "../config/api";
import type { EmployeesResponse } from "../types/auth";
import api from "./api";

class EmployeeService {
  async getEmployeesByDepartment(): Promise<EmployeesResponse> {
    try {
      console.log("Obteniendo empleados por departamento...");

      const response = await api.get<EmployeesResponse>(
        API_CONFIG.ENDPOINTS.EMPLOYEES.LIST_BY_DEPARTMENT
      );

      console.log("Empleados obtenidos:", response.data);

      return response.data;

    } catch (error: any) {
      console.error("Error al obtener empleados:", error);

      const message =
        error?.response?.data?.message ||
        error.message ||
        "Error al obtener empleados";
      throw new Error(message);
    }
  }
}

export const employeeService = new EmployeeService();
