import { Roles } from "../enums/roles";

export function normalizeRolIds(
  user: { rolIds?: number[]; rolId?: number } | null | undefined,
): number[] {
  if (user?.rolIds?.length) return user.rolIds;
  if (user?.rolId != null) return [user.rolId];
  return [];
}

export function hasAnyRole(rolIds: number[], ...roles: number[]): boolean {
  return roles.some((r) => rolIds.includes(r));
}

/** Home redirect priority: first matching role the user has wins. */
export const HOME_ROLE_PRIORITY = [
  Roles.RRHH,
  Roles.SUPERVISOR_CONTABILIDAD,
  Roles.GERENCIA,
  Roles.SISTEMAS,
  Roles.LOGISTICA,
  Roles.SUPERVISOR,
  Roles.ASISTENTE_CONTABILIDAD,
  Roles.EMPLEADO,
];
