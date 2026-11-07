import * as React from "react";
import type { Empleado } from "../../../../../services/empleadoService";
import CalculoHorasTrabajoService from "../../../../../services/calculoHorasTrabajoService";
import { RangosFechasAlimentacionService } from "../../../../../services/rangosFechasAlimentacionService";
import type { DeduccionAlimentacionDetalleDto } from "../../../../../dtos/calculoHorasTrabajoDto";

export interface ErrorAlimentacion {
  tieneError: boolean;
  mensajeError: string;
}

export interface UseAlimentacionPorCodigoParams {
  empleado: Empleado | null;
  fechaInicio: string;
  fechaFin: string;
  rangoValido: boolean;
  codigoNominaPeriodo: string;
}

export interface UseAlimentacionPorCodigoReturn {
  deduccionAlimentacion: number;
  setDeduccionAlimentacion: React.Dispatch<React.SetStateAction<number>>;
  inputDeduccionAlimentacion: string;
  setInputDeduccionAlimentacion: React.Dispatch<
    React.SetStateAction<string>
  >;
  detalleDeduccionAlimentacion: DeduccionAlimentacionDetalleDto[];
  totalDetalleAlimentacion: number;
  deduccionAlojamiento: number;
  setDeduccionAlojamiento: React.Dispatch<React.SetStateAction<number>>;
  inputDeduccionAlojamiento: string;
  setInputDeduccionAlojamiento: React.Dispatch<React.SetStateAction<string>>;
  detalleDeduccionAlojamiento: DeduccionAlimentacionDetalleDto[];
  totalDetalleAlojamiento: number;
  loadingAlimentacion: boolean;
  errorAlimentacion: ErrorAlimentacion | null;
  setErrorAlimentacion: React.Dispatch<
    React.SetStateAction<ErrorAlimentacion | null>
  >;
  modalDetalleAlimentacionOpen: boolean;
  setModalDetalleAlimentacionOpen: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  modalDetalleAlojamientoOpen: boolean;
  setModalDetalleAlojamientoOpen: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

/**
 * Hook que carga las deducciones de alimentación y alojamiento del empleado
 * para el código de nómina indicado (un solo llamado; se separan por Categoria).
 */
export function useAlimentacionPorCodigo({
  empleado,
  fechaInicio,
  fechaFin,
  rangoValido,
  codigoNominaPeriodo,
}: UseAlimentacionPorCodigoParams): UseAlimentacionPorCodigoReturn {
  const [deduccionAlimentacion, setDeduccionAlimentacion] =
    React.useState<number>(0);
  const [inputDeduccionAlimentacion, setInputDeduccionAlimentacion] =
    React.useState<string>("");
  const [deduccionAlojamiento, setDeduccionAlojamiento] =
    React.useState<number>(0);
  const [inputDeduccionAlojamiento, setInputDeduccionAlojamiento] =
    React.useState<string>("");

  const [errorAlimentacion, setErrorAlimentacion] =
    React.useState<ErrorAlimentacion | null>(null);
  const [loadingAlimentacion, setLoadingAlimentacion] =
    React.useState<boolean>(false);
  const [detalleDeduccionAlimentacion, setDetalleDeduccionAlimentacion] =
    React.useState<DeduccionAlimentacionDetalleDto[]>([]);
  const [detalleDeduccionAlojamiento, setDetalleDeduccionAlojamiento] =
    React.useState<DeduccionAlimentacionDetalleDto[]>([]);
  const [modalDetalleAlimentacionOpen, setModalDetalleAlimentacionOpen] =
    React.useState<boolean>(false);
  const [modalDetalleAlojamientoOpen, setModalDetalleAlojamientoOpen] =
    React.useState<boolean>(false);

  const resetValores = React.useCallback(() => {
    setDeduccionAlimentacion(0);
    setInputDeduccionAlimentacion("");
    setDetalleDeduccionAlimentacion([]);
    setDeduccionAlojamiento(0);
    setInputDeduccionAlojamiento("");
    setDetalleDeduccionAlojamiento([]);
  }, []);

  // Cargar deducciones de alimentación/alojamiento desde el mismo endpoint
  // Se aplican siempre (tanto en A como en B)
  React.useEffect(() => {
    const cargarDeduccionAlimentacion = async () => {
      // Necesitamos el código del empleado, no el ID
      const codigoEmpleado = (empleado as any)?.codigo;
      if (!codigoEmpleado || !fechaInicio || !fechaFin || !rangoValido) {
        resetValores();
        setModalDetalleAlimentacionOpen(false);
        setModalDetalleAlojamientoOpen(false);
        if (!codigoEmpleado && empleado?.id) {
          // Si no hay código pero hay empleado, mostrar error
          setErrorAlimentacion({
            tieneError: true,
            mensajeError: "El empleado no tiene código asignado",
          });
        } else {
          setErrorAlimentacion(null);
        }
        return;
      }

      setLoadingAlimentacion(true);
      setErrorAlimentacion(null);
      setModalDetalleAlimentacionOpen(false);
      setModalDetalleAlojamientoOpen(false);
      const codigoNomina = codigoNominaPeriodo;
      if (!codigoNomina) {
        setErrorAlimentacion({
          tieneError: true,
          mensajeError:
            "No se pudo generar el código de nómina del período seleccionado",
        });
        setLoadingAlimentacion(false);
        return;
      }

      console.log("[CalculoNominas] Cargando deducciones de alimentación/alojamiento:", {
        codigoEmpleado,
        codigoNomina,
        rangoValido,
      });

      try {
        const { items } = await RangosFechasAlimentacionService.listByCodigo(
          codigoNomina,
        );
        const rangoAlimentacion = items[0];
        if (!rangoAlimentacion) {
          setErrorAlimentacion({
            tieneError: true,
            mensajeError: `No se ha registrado un rango de fechas de alimentación para el código de nómina ${codigoNomina}`,
          });
          resetValores();
          setLoadingAlimentacion(false);
          return;
        }

        const fechaInicioAlimentacion = rangoAlimentacion.fechaInicio;
        const fechaFinAlimentacion = rangoAlimentacion.fechaFin;
        const fechaInicioFormato = fechaInicioAlimentacion.match(
          /^\d{4}-\d{2}-\d{2}$/,
        );
        const fechaFinFormato = fechaFinAlimentacion.match(/^\d{4}-\d{2}-\d{2}$/);

        if (!fechaInicioFormato || !fechaFinFormato) {
          setErrorAlimentacion({
            tieneError: true,
            mensajeError: `Formato de fecha inválido en parámetros de alimentación para el código ${codigoNomina}`,
          });
          resetValores();
          setLoadingAlimentacion(false);
          return;
        }

        // Un solo llamado: la respuesta trae ALIMENTACION y ALOJAMIENTO
        const t0 = Date.now();
        const resultado = await CalculoHorasTrabajoService.getDeduccionesAlimentacion(
          codigoEmpleado,
          fechaInicioAlimentacion,
          fechaFinAlimentacion,
        );
        const tiempoTranscurrido = Date.now() - t0;
        console.log(
          `[CalculoNominas] Deducciones obtenidas en ${tiempoTranscurrido}ms:`,
          resultado,
        );

        // Solo manejar el error específico de alimentación que viene en el objeto
        if (resultado.errorAlimentacion?.tieneError) {
          setErrorAlimentacion(resultado.errorAlimentacion);
          resetValores();
        } else {
          const valorAlimentacion = resultado.deduccionesAlimentacion ?? 0;
          const valorAlojamiento = resultado.deduccionesAlojamiento ?? 0;
          setDeduccionAlimentacion(valorAlimentacion);
          setInputDeduccionAlimentacion(
            valorAlimentacion > 0 ? String(valorAlimentacion) : "",
          );
          setDetalleDeduccionAlimentacion(
            resultado.detalleAlimentacion ?? [],
          );
          setDeduccionAlojamiento(valorAlojamiento);
          setInputDeduccionAlojamiento(
            valorAlojamiento > 0 ? String(valorAlojamiento) : "",
          );
          setDetalleDeduccionAlojamiento(resultado.detalleAlojamiento ?? []);
          setErrorAlimentacion(null);
        }
      } catch (err: any) {
        // Error al obtener deducciones de alimentación/alojamiento
        setErrorAlimentacion({
          tieneError: true,
          mensajeError:
            err?.response?.data?.message ||
            err?.message ||
            "Error al obtener deducciones de alimentación",
        });
        resetValores();
        setLoadingAlimentacion(false);
      } finally {
        setLoadingAlimentacion(false);
      }
    };

    cargarDeduccionAlimentacion();
  }, [
    empleado?.id,
    (empleado as any)?.codigo,
    fechaInicio,
    fechaFin,
    rangoValido,
    codigoNominaPeriodo,
    resetValores,
  ]);

  const totalDetalleAlimentacion = React.useMemo(
    () =>
      detalleDeduccionAlimentacion.reduce(
        (acum, item) => acum + (item.precio || 0),
        0,
      ),
    [detalleDeduccionAlimentacion],
  );

  const totalDetalleAlojamiento = React.useMemo(
    () =>
      detalleDeduccionAlojamiento.reduce(
        (acum, item) => acum + (item.precio || 0),
        0,
      ),
    [detalleDeduccionAlojamiento],
  );

  return {
    deduccionAlimentacion,
    setDeduccionAlimentacion,
    inputDeduccionAlimentacion,
    setInputDeduccionAlimentacion,
    detalleDeduccionAlimentacion,
    totalDetalleAlimentacion,
    deduccionAlojamiento,
    setDeduccionAlojamiento,
    inputDeduccionAlojamiento,
    setInputDeduccionAlojamiento,
    detalleDeduccionAlojamiento,
    totalDetalleAlojamiento,
    loadingAlimentacion,
    errorAlimentacion,
    setErrorAlimentacion,
    modalDetalleAlimentacionOpen,
    setModalDetalleAlimentacionOpen,
    modalDetalleAlojamientoOpen,
    setModalDetalleAlojamientoOpen,
  };
}
