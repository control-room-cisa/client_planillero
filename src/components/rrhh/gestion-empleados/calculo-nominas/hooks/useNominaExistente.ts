import * as React from "react";
import NominaService from "../../../../../services/nominaService";
import { derivarCodigoNomina } from "../utils/periodos";

export interface UseNominaExistenteParams {
  empleadoId: number | string | undefined | null;
  fechaInicio: string;
  fechaFin: string;
  rangoValido: boolean;
}

export interface UseNominaExistenteReturn {
  nominaExiste: boolean;
  setNominaExiste: React.Dispatch<React.SetStateAction<boolean>>;
  loadingNominaCheck: boolean;
}

/**
 * Verifica automáticamente si ya existe una nómina del empleado para el período
 * seleccionado (mismo código de nómina, intervalo exacto o traslape de fechas).
 */
export function useNominaExistente({
  empleadoId,
  fechaInicio,
  fechaFin,
  rangoValido,
}: UseNominaExistenteParams): UseNominaExistenteReturn {
  const [nominaExiste, setNominaExiste] = React.useState<boolean>(false);
  const [loadingNominaCheck, setLoadingNominaCheck] =
    React.useState<boolean>(false);

  React.useEffect(() => {
    const verificarNominaExistente = async () => {
      if (!empleadoId || !rangoValido || !fechaInicio || !fechaFin) {
        setNominaExiste(false);
        return;
      }

      setLoadingNominaCheck(true);
      try {
        const existentes = await NominaService.list({
          empleadoId: Number(empleadoId),
        });

        const codigoPeriodo = derivarCodigoNomina(fechaInicio, fechaFin);
        const toDate = (s: string) =>
          new Date(s + (s.length === 10 ? "T00:00:00" : ""));
        const startNew = toDate(fechaInicio);
        const endNew = toDate(fechaFin);

        const existeMismoPeriodo = existentes.some((n) => {
          if (n.codigoNomina && n.codigoNomina === codigoPeriodo) {
            return true;
          }

          const nFechaInicio = String(n.fechaInicio || "").split("T")[0];
          const nFechaFin = String(n.fechaFin || "").split("T")[0];

          if (nFechaInicio === fechaInicio && nFechaFin === fechaFin) {
            return true;
          }

          const s = toDate(nFechaInicio);
          const e = toDate(nFechaFin);
          return s <= endNew && startNew <= e;
        });

        setNominaExiste(existeMismoPeriodo);
      } catch (error) {
        console.error("Error al verificar nóminas existentes:", error);
        setNominaExiste(false);
      } finally {
        setLoadingNominaCheck(false);
      }
    };

    verificarNominaExistente();
  }, [empleadoId, fechaInicio, fechaFin, rangoValido]);

  return { nominaExiste, setNominaExiste, loadingNominaCheck };
}
