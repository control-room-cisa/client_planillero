// src/hooks/useHorasTrabajo.ts
import { useState, useEffect, useCallback } from "react";
import CalculoHorasTrabajoService, {
  type ResumenHorasTrabajo,
} from "../services/calculoHorasTrabajoService";

interface UseHorasTrabajoProps {
  empleadoId: string | number;
  fechaInicio: string;
  fechaFin: string;
  enabled?: boolean;
}

interface UseHorasTrabajoReturn {
  resumenHoras: ResumenHorasTrabajo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useHorasTrabajo = ({
  empleadoId,
  fechaInicio,
  fechaFin,
  enabled = true,
}: UseHorasTrabajoProps): UseHorasTrabajoReturn => {
  const [resumenHoras, setResumenHoras] = useState<ResumenHorasTrabajo | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !empleadoId || !fechaInicio || !fechaFin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resumen = await CalculoHorasTrabajoService.getResumenHorasTrabajo(
        empleadoId,
        fechaInicio,
        fechaFin
      );
      setResumenHoras(resumen);
    } catch (err: any) {
      console.error("Error al cargar datos de horas:", err);
      setError(err.message || "Error al cargar datos de horas");
    } finally {
      setLoading(false);
    }
  }, [empleadoId, fechaInicio, fechaFin, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    resumenHoras,
    loading,
    error,
    refetch,
  };
};
