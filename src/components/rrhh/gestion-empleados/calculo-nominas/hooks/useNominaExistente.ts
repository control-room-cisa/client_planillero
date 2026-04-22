import * as React from "react";
import NominaService from "../../../../../services/nominaService";

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
 * Verifica automáticamente si ya existe una nómina del empleado con el mismo
 * intervalo exacto de fechas (fechaInicio y fechaFin). Se usa para deshabilitar
 * el botón de "Generar Nómina" y mostrar el aviso correspondiente.
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

        // Verificar si existe una nómina con el mismo intervalo exacto (fechaInicio y fechaFin iguales)
        const existeMismoIntervalo = existentes.some((n) => {
          const nFechaInicio =
            n.fechaInicio &&
            typeof n.fechaInicio === "object" &&
            "toISOString" in n.fechaInicio
              ? (n.fechaInicio as Date).toISOString().split("T")[0]
              : String(n.fechaInicio || "").split("T")[0];
          const nFechaFin =
            n.fechaFin &&
            typeof n.fechaFin === "object" &&
            "toISOString" in n.fechaFin
              ? (n.fechaFin as Date).toISOString().split("T")[0]
              : String(n.fechaFin || "").split("T")[0];

          return nFechaInicio === fechaInicio && nFechaFin === fechaFin;
        });

        setNominaExiste(existeMismoIntervalo);
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
