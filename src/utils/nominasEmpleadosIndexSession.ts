/** Misma forma que `EmpleadoIndexItem` en Layout (evita importar el Layout completo). */
export type EmpleadoIndexItemForSession = {
  id: number;
  codigo?: string | null;
  nombreCompleto: string;
};

type EmpleadoIndexSource = {
  id: number;
  codigo?: string | null;
  nombre?: string;
  apellido?: string;
  activo?: boolean;
};

export function toEmpleadoIndexItem(
  empleado: EmpleadoIndexSource
): EmpleadoIndexItemForSession {
  return {
    id: empleado.id,
    codigo: empleado.codigo ?? null,
    nombreCompleto: `${empleado.nombre ?? ""} ${empleado.apellido ?? ""}`.trim(),
  };
}

/** Índice para navegación en nóminas: todos los activos, o solo el inactivo seleccionado. */
export function resolveEmpleadosIndexForNomina(
  empleado: EmpleadoIndexSource,
  activosIndex: EmpleadoIndexItemForSession[]
): EmpleadoIndexItemForSession[] {
  return empleado.activo ? activosIndex : [toEmpleadoIndexItem(empleado)];
}

/** Si el colaborador inactivo no está en el índice entrante, usar lista de un solo elemento. */
export function isSameEmpleadosIndex(
  a: EmpleadoIndexItemForSession[],
  b: EmpleadoIndexItemForSession[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.id === b[i].id &&
      item.codigo === b[i].codigo &&
      item.nombreCompleto === b[i].nombreCompleto
  );
}

export function resolveEffectiveEmpleadosIndex(
  empleado: EmpleadoIndexSource | null,
  baseIndex: EmpleadoIndexItemForSession[]
): EmpleadoIndexItemForSession[] {
  if (!empleado) return baseIndex;

  const inIndex = baseIndex.some(
    (x) =>
      x.id === empleado.id ||
      (empleado.codigo != null &&
        empleado.codigo !== "" &&
        x.codigo === empleado.codigo)
  );
  if (inIndex) return baseIndex;
  if (!empleado.activo) return [toEmpleadoIndexItem(empleado)];
  return baseIndex;
}

export const NOMINAS_EMPLEADOS_INDEX_SESSION_KEY =
  "planillero_rrhh_nominas_empleados_index_v1";

export const PRORRATEO_EMPLEADOS_INDEX_SESSION_KEY =
  "planillero_prorrateo_empleados_index_v1";

export function persistEmpleadosIndexSession(
  list: EmpleadoIndexItemForSession[]
): void {
  persistEmpleadosIndexSessionByKey(
    NOMINAS_EMPLEADOS_INDEX_SESSION_KEY,
    list
  );
}

export function readEmpleadosIndexSession(): EmpleadoIndexItemForSession[] | null {
  return readEmpleadosIndexSessionByKey(NOMINAS_EMPLEADOS_INDEX_SESSION_KEY);
}

export function persistProrrateoIndexSession(
  list: EmpleadoIndexItemForSession[]
): void {
  persistEmpleadosIndexSessionByKey(
    PRORRATEO_EMPLEADOS_INDEX_SESSION_KEY,
    list
  );
}

export function readProrrateoIndexSession(): EmpleadoIndexItemForSession[] | null {
  return readEmpleadosIndexSessionByKey(PRORRATEO_EMPLEADOS_INDEX_SESSION_KEY);
}

function persistEmpleadosIndexSessionByKey(
  key: string,
  list: EmpleadoIndexItemForSession[]
): void {
  try {
    if (!list?.length) return;
    sessionStorage.setItem(key, JSON.stringify(list));
  } catch {
    // quota / modo privado
  }
}

function readEmpleadosIndexSessionByKey(
  key: string
): EmpleadoIndexItemForSession[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as EmpleadoIndexItemForSession[];
  } catch {
    return null;
  }
}
