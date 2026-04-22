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
  loadingAlimentacion: boolean;
  errorAlimentacion: ErrorAlimentacion | null;
  setErrorAlimentacion: React.Dispatch<
    React.SetStateAction<ErrorAlimentacion | null>
  >;
  modalDetalleAlimentacionOpen: boolean;
  setModalDetalleAlimentacionOpen: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

/**
 * Hook que carga las deducciones de alimentación del empleado para el código
 * de nómina indicado. Encapsula estado + modal de detalle + manejo de errores.
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

  const [errorAlimentacion, setErrorAlimentacion] =
    React.useState<ErrorAlimentacion | null>(null);
  const [loadingAlimentacion, setLoadingAlimentacion] =
    React.useState<boolean>(false);
  const [detalleDeduccionAlimentacion, setDetalleDeduccionAlimentacion] =
    React.useState<DeduccionAlimentacionDetalleDto[]>([]);
  const [modalDetalleAlimentacionOpen, setModalDetalleAlimentacionOpen] =
    React.useState<boolean>(false);

  // Cargar deducciones de alimentación directamente desde el endpoint externo
  // Alimentación se aplica siempre (tanto en A como en B)
  React.useEffect(() => {
    const cargarDeduccionAlimentacion = async () => {
      // Necesitamos el código del empleado, no el ID
      const codigoEmpleado = (empleado as any)?.codigo;
      if (!codigoEmpleado || !fechaInicio || !fechaFin || !rangoValido) {
        setDetalleDeduccionAlimentacion([]);
        setModalDetalleAlimentacionOpen(false);
        setDeduccionAlimentacion(0);
        setInputDeduccionAlimentacion("");
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

      console.log("[CalculoNominas] Cargando deducciones de alimentación:", {
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
          setDeduccionAlimentacion(0);
          setInputDeduccionAlimentacion("");
          setDetalleDeduccionAlimentacion([]);
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
          setDeduccionAlimentacion(0);
          setInputDeduccionAlimentacion("");
          setDetalleDeduccionAlimentacion([]);
          setLoadingAlimentacion(false);
          return;
        }

        // Llamar al endpoint del backend que a su vez llama a la API externa
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
          // Si hay error, establecer el campo en 0 y habilitar edición
          setDeduccionAlimentacion(0);
          setInputDeduccionAlimentacion("");
          setDetalleDeduccionAlimentacion([]);
        } else {
          // Si no hay error (success = true), usar el valor calculado (no editable)
          const valorCalculado = resultado.deduccionesAlimentacion ?? 0;
          setDeduccionAlimentacion(valorCalculado);
          setInputDeduccionAlimentacion(
            valorCalculado > 0 ? String(valorCalculado) : "",
          );
          setErrorAlimentacion(null);
          setDetalleDeduccionAlimentacion(resultado.detalle ?? []);
        }
      } catch (err: any) {
        // Error al obtener deducciones de alimentación
        setErrorAlimentacion({
          tieneError: true,
          mensajeError:
            err?.response?.data?.message ||
            err?.message ||
            "Error al obtener deducciones de alimentación",
        });
        setDeduccionAlimentacion(0);
        setInputDeduccionAlimentacion("");
        setDetalleDeduccionAlimentacion([]);
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
  ]);

  const totalDetalleAlimentacion = React.useMemo(
    () =>
      detalleDeduccionAlimentacion.reduce(
        (acum, item) => acum + (item.precio || 0),
        0,
      ),
    [detalleDeduccionAlimentacion],
  );

  return {
    deduccionAlimentacion,
    setDeduccionAlimentacion,
    inputDeduccionAlimentacion,
    setInputDeduccionAlimentacion,
    detalleDeduccionAlimentacion,
    totalDetalleAlimentacion,
    loadingAlimentacion,
    errorAlimentacion,
    setErrorAlimentacion,
    modalDetalleAlimentacionOpen,
    setModalDetalleAlimentacionOpen,
  };
}
