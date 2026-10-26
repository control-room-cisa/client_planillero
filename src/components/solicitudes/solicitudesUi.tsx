import { Chip } from "@mui/material";
import type { SolicitudEmpleado, SolicitudPermiso } from "../../services/solicitudPermisoService";

export const TIPO_LABEL = {
  VACACIONES: "Vacaciones",
  PERMISO: "Permiso",
} as const;

export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const [year, month, day] = fecha.slice(0, 10).split("-");
  if (!year || !month || !day) return fecha;
  return `${day}/${month}/${year}`;
}

export function formatFechaHora(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatFecha(value);
  return date.toLocaleString("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function rangoFechas(item: Pick<
  SolicitudPermiso,
  "primeraFecha" | "ultimaFecha" | "totalDias"
>): string {
  if (!item.primeraFecha) return "—";
  const rango =
    item.primeraFecha === item.ultimaFecha
      ? formatFecha(item.primeraFecha)
      : `${formatFecha(item.primeraFecha)} – ${formatFecha(item.ultimaFecha)}`;
  const dias = item.totalDias === 1 ? "1 día" : `${item.totalDias} días`;
  return `${rango} (${dias})`;
}

export function nombreEmpleado(empleado: SolicitudEmpleado): string {
  const nombre = [empleado.nombre, empleado.apellido].filter(Boolean).join(" ");
  return empleado.codigo ? `${empleado.codigo} — ${nombre}` : nombre;
}

export function EstadoAprobacion({ value }: { value: boolean | null }) {
  if (value === true) {
    return <Chip size="small" color="success" label="Aprobado" />;
  }
  if (value === false) {
    return <Chip size="small" color="error" label="Rechazado" />;
  }
  return <Chip size="small" label="Pendiente" />;
}
