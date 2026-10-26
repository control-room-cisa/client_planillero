import { useCallback, useEffect, useState } from "react";
import { Roles } from "../enums/roles";
import { useAuth } from "./useAuth";
import {
  onSolicitudesCambiaron,
  SolicitudPermisoService,
} from "../services/solicitudPermisoService";
import { hasAnyRole, normalizeRolIds } from "../utils/roles";

const REFRESH_MS = 60_000;

export function useSolicitudesPendientesCount() {
  const { user } = useAuth();
  const [supervisor, setSupervisor] = useState(0);
  const [rrhh, setRrhh] = useState(0);
  const rolKey = normalizeRolIds(user).join(",");

  const fetchCount = useCallback(async () => {
    const rolIds = rolKey ? rolKey.split(",").map(Number) : [];
    const tasks: Promise<void>[] = [];
    if (hasAnyRole(rolIds, Roles.SUPERVISOR)) {
      tasks.push(
        SolicitudPermisoService.pendientesSupervision()
          .then(setSupervisor)
          .catch(() => undefined)
      );
    }
    if (hasAnyRole(rolIds, Roles.RRHH)) {
      tasks.push(
        SolicitudPermisoService.pendientesRrhh()
          .then(setRrhh)
          .catch(() => undefined)
      );
    }
    await Promise.all(tasks);
  }, [rolKey]);

  useEffect(() => {
    void fetchCount();
    const onFocus = () => {
      void fetchCount();
    };
    window.addEventListener("focus", onFocus);
    const stop = onSolicitudesCambiaron(() => {
      void fetchCount();
    });
    const timer = window.setInterval(() => {
      void fetchCount();
    }, REFRESH_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      stop();
      window.clearInterval(timer);
    };
  }, [fetchCount]);

  return { supervisor, rrhh };
}
