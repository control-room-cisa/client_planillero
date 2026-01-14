// src/enums/roles.ts
export const Roles = {
  EMPLEADO: 1,
  SUPERVISOR: 2,
  RRHH: 3,
  SUPERVISOR_CONTABILIDAD: 4,
  GERENCIA: 5,
  SISTEMAS: 6,
  ASISTENTE_CONTABILIDAD: 7,
} as const;

export type Roles = (typeof Roles)[keyof typeof Roles];
