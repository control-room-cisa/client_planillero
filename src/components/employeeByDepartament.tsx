import { useEffect, useState } from "react";
import { employeeService } from "../services/empleadoService";
import type { Employee } from "../types/auth";

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await employeeService.getEmployeesByDepartment();
        setEmployees(response.data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error al obtener empleados");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading, error };
};
