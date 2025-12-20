// src/enums/roles.ts
export const Roles = {
  EMPLEADO: 1,
  SUPERVISOR: 2,
  RRHH: 3,
  CONTABILIDAD: 4,
  GERENCIA: 5,
  SISTEMAS: 6,
} as const;

export type Roles = (typeof Roles)[keyof typeof Roles];
