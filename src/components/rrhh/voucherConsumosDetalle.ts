import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import { RangosFechasAlimentacionService } from "../../services/rangosFechasAlimentacionService";

export type VoucherConsumoDetalleItem = {
  producto: string;
  precio: number;
  fecha: string;
  categoria?: "ALIMENTACION" | "ALOJAMIENTO";
};

export type VoucherConsumosDetalle = {
  detalleAlimentacion: VoucherConsumoDetalleItem[];
  detalleAlojamiento: VoucherConsumoDetalleItem[];
  rangoFechaInicio?: string | null;
  rangoFechaFin?: string | null;
  errorMensaje?: string | null;
};

export type RangoFechasAlimentacionCache = {
  fechaInicio: string;
  fechaFin: string;
};

function sortByFecha(items: VoucherConsumoDetalleItem[]): VoucherConsumoDetalleItem[] {
  return [...items].sort((a, b) =>
    String(a.fecha || "").localeCompare(String(b.fecha || "")),
  );
}

/** Obtiene el rango de alimentación asociado al código de nómina (una sola vez por período). */
export async function resolveRangoAlimentacionPorCodigo(
  codigoNomina: string | null | undefined,
): Promise<RangoFechasAlimentacionCache | null> {
  const codigo = (codigoNomina || "").trim();
  if (!codigo) return null;

  const { items } = await RangosFechasAlimentacionService.listByCodigo(codigo);
  const rango = items[0];
  if (!rango?.fechaInicio || !rango?.fechaFin) return null;

  const okInicio = /^\d{4}-\d{2}-\d{2}$/.test(rango.fechaInicio);
  const okFin = /^\d{4}-\d{2}-\d{2}$/.test(rango.fechaFin);
  if (!okInicio || !okFin) return null;

  return {
    fechaInicio: rango.fechaInicio,
    fechaFin: rango.fechaFin,
  };
}

/**
 * Carga el detalle de consumos de alimentación y alojamiento para el voucher.
 * Si se pasa `rangoCache`, evita consultar el rango otra vez (útil en PDF masivo).
 */
export async function loadVoucherConsumosDetalle(params: {
  codigoEmpleado: string | null | undefined;
  codigoNomina: string | null | undefined;
  rangoCache?: RangoFechasAlimentacionCache | null;
}): Promise<VoucherConsumosDetalle> {
  const codigoEmpleado = (params.codigoEmpleado || "").trim();
  if (!codigoEmpleado) {
    return {
      detalleAlimentacion: [],
      detalleAlojamiento: [],
      errorMensaje: "El colaborador no tiene código asignado",
    };
  }

  try {
    const rango =
      params.rangoCache ??
      (await resolveRangoAlimentacionPorCodigo(params.codigoNomina));

    if (!rango) {
      const codigo = (params.codigoNomina || "").trim() || "—";
      return {
        detalleAlimentacion: [],
        detalleAlojamiento: [],
        errorMensaje: `No hay rango de fechas de alimentación para el código ${codigo}`,
      };
    }

    const resultado = await CalculoHorasTrabajoService.getDeduccionesAlimentacion(
      codigoEmpleado,
      rango.fechaInicio,
      rango.fechaFin,
    );

    if (resultado.errorAlimentacion?.tieneError) {
      return {
        detalleAlimentacion: [],
        detalleAlojamiento: [],
        rangoFechaInicio: rango.fechaInicio,
        rangoFechaFin: rango.fechaFin,
        errorMensaje:
          resultado.errorAlimentacion.mensajeError ||
          "No se pudo obtener el detalle de consumos",
      };
    }

    return {
      detalleAlimentacion: sortByFecha(resultado.detalleAlimentacion ?? []),
      detalleAlojamiento: sortByFecha(resultado.detalleAlojamiento ?? []),
      rangoFechaInicio: rango.fechaInicio,
      rangoFechaFin: rango.fechaFin,
      errorMensaje: null,
    };
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message || "")
        : "";
    return {
      detalleAlimentacion: [],
      detalleAlojamiento: [],
      errorMensaje:
        message || "Error al obtener el detalle de alimentación/alojamiento",
    };
  }
}
