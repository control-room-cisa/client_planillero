import { useEffect, useState } from "react";
import EmpleadoService, { type Empleado } from "../services/empleadoService";

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const empleados = await EmpleadoService.getAll();
        setEmployees(empleados);
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
