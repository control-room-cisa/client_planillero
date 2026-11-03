import { useState, useEffect, useCallback } from "react";
import RegistroDiarioService from "../services/registroDiarioService";
import { NotificacionLogService } from "../services/notificacionLogService";
import ymdInTZ from "../utils/timeZone";

export const useNotificationCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const dates: string[] = [];

      for (let i = 0; i < 20; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const ymd = ymdInTZ(date);
        if (ymd) dates.push(ymd);
      }

      const [registros, logsPendientes] = await Promise.all([
        Promise.all(
          dates.map((fecha) =>
            RegistroDiarioService.getByDate(fecha).catch(() => null)
          )
        ),
        NotificacionLogService.countPendientes().catch(() => 0),
      ]);

      const rechazoCount = registros.filter((registro) => {
        if (!registro) return false;
        const supervisorRechazado = registro.aprobacionSupervisor === false;
        const rrhhRechazado = registro.aprobacionRrhh === false;
        return supervisorRechazado || rrhhRechazado;
      }).length;

      setCount(rechazoCount + logsPendientes);
    } catch (err) {
      console.error("Error al cargar conteo de notificaciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, loading, refetch: fetchCount };
};
