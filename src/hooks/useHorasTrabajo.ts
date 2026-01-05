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
  error: any | null;
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
  const [error, setError] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !empleadoId || !fechaInicio || !fechaFin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[useHorasTrabajo] request", {
        empleadoId,
        fechaInicio,
        fechaFin,
      });
      const resumen = await CalculoHorasTrabajoService.getResumenHorasTrabajo(
        empleadoId,
        fechaInicio,
        fechaFin
      );
      setResumenHoras(resumen);
    } catch (err: any) {
      // Dejar evidencia clara en consola (producción) de dónde falló
      const reqId =
        err?.response?.headers?.["x-request-id"] ||
        err?.config?.headers?.["X-Request-Id"];
      console.error("[useHorasTrabajo] error", {
        requestId: reqId,
        message: err?.message,
        status: err?.response?.status,
        response: err?.response?.data,
        url: err?.config?.url,
        baseURL: err?.config?.baseURL,
      });
      setError(err);
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
