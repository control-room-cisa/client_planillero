// Interfaces y tipos para el sistema de reglas de horarios (H1, H2, H3, ...)

export type FieldName =
  | "horaEntrada"
  | "horaSalida"
  | "jornada"
  | "esDiaLibre"
  | "esHoraCorrida"
  | "comentarioEmpleado";

export interface FieldStateConfig {
  visible: boolean;
  enabled: boolean;
  required: boolean;
  helperText?: string;
  defaultValue?: any;
}

export interface HorarioFormRulesConfig {
  type: string; // H1, H2, ...
  fields: Record<FieldName, FieldStateConfig>;
  calculateNormalHours: (formData: any, apiData?: any, ctx?: { now?: Date }) => number;
  calculateLunchHours: (formData: any) => number;
  processApiDefaults: (prev: any, apiData: any | null | undefined, hasExisting: boolean) => any;
}

export interface HorarioRuleEngine {
  type: string;
  name: string;
  config: HorarioFormRulesConfig;
}


