// src/hooks/useProrrateo.ts
import { useState, useEffect, useCallback } from "react";
import CalculoHorasTrabajoService from "../services/calculoHorasTrabajoService";
import type { ConteoHorasProrrateoDto } from "../dtos/calculoHorasTrabajoDto";

interface UseProrrateoProps {
  empleadoId: string | number;
  fechaInicio: string;
  fechaFin: string;
  enabled?: boolean;
}

interface UseProrrateoReturn {
  prorrateo: ConteoHorasProrrateoDto | null;
  loading: boolean;
  error: any | null;
  refetch: () => Promise<void>;
}

export const useProrrateo = ({
  empleadoId,
  fechaInicio,
  fechaFin,
  enabled = true,
}: UseProrrateoProps): UseProrrateoReturn => {
  const [prorrateo, setProrrateo] = useState<ConteoHorasProrrateoDto | null>(
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
      const data = await CalculoHorasTrabajoService.getProrrateo(
        empleadoId,
        fechaInicio,
        fechaFin
      );
      setProrrateo(data);
    } catch (err: any) {
      console.error("Error al cargar datos de prorrateo:", err);
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
    prorrateo,
    loading,
    error,
    refetch,
  };
};

