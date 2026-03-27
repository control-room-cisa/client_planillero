/** Misma forma que `EmpleadoIndexItem` en Layout (evita importar el Layout completo). */
export type EmpleadoIndexItemForSession = {
  id: number;
  codigo?: string | null;
  nombreCompleto: string;
};

export const NOMINAS_EMPLEADOS_INDEX_SESSION_KEY =
  "planillero_rrhh_nominas_empleados_index_v1";

export function persistEmpleadosIndexSession(
  list: EmpleadoIndexItemForSession[]
): void {
  try {
    if (!list?.length) return;
    sessionStorage.setItem(
      NOMINAS_EMPLEADOS_INDEX_SESSION_KEY,
      JSON.stringify(list)
    );
  } catch {
    // quota / modo privado
  }
}

export function readEmpleadosIndexSession(): EmpleadoIndexItemForSession[] | null {
  try {
    const raw = sessionStorage.getItem(NOMINAS_EMPLEADOS_INDEX_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as EmpleadoIndexItemForSession[];
  } catch {
    return null;
  }
}
