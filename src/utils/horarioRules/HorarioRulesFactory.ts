import { DefaultRules } from "./DefaultRules";
import { H1Rules } from "./H1Rules";
import { H1EditableRules } from "./H1EditableRules";
import { H1_5Rules } from "./H1_5Rules";
import { H1_7Rules } from "./H1_7Rules";
import { H2Rules } from "./H2Rules";
import { H2_2Rules } from "./H2_2Rules";
import type { FieldName, HorarioFormRulesConfig, HorarioRuleEngine } from "./interfaces";

const registry = new Map<string, HorarioRuleEngine>([
  // Canonical: H1_1
  [H1Rules.type, H1Rules],
  // Alias pending/legacy variants
  ["H1_2", H1Rules],
  // H1 "editables" (aplica a H1.4 y otros H1_n que requieran edición de entrada/salida)
  ["H1_3", H1EditableRules],
  ["H1_4", H1EditableRules],
  // H1_5 tiene reglas propias (horas no editables + día libre read-only)
  ["H1_5", H1_5Rules],
  // H1_6: mismo comportamiento que H1_1 (la diferencia viene del backend)
  ["H1_6", H1Rules],
  // H1_7: horario editable con día libre
  [H1_7Rules.type, H1_7Rules],
  // Canonical: H2_1
  [H2Rules.type, H2Rules],
  // Canonical: H2_2
  [H2_2Rules.type, H2_2Rules],
  [DefaultRules.type, DefaultRules],
]);

export class HorarioRulesFactory {
  static getRule(tipoHorario?: string | null): HorarioRuleEngine {
    if (tipoHorario && registry.has(tipoHorario)) return registry.get(tipoHorario)!;
    return DefaultRules;
  }

  static getConfig(tipoHorario?: string | null): HorarioFormRulesConfig {
    return this.getRule(tipoHorario).config;
  }

  static isFieldVisible(tipoHorario: string | undefined, field: FieldName): boolean {
    return this.getConfig(tipoHorario).fields[field].visible;
  }

  static isFieldEnabled(tipoHorario: string | undefined, field: FieldName): boolean {
    return this.getConfig(tipoHorario).fields[field].enabled;
  }

  static getFieldConfig(tipoHorario: string | undefined, field: FieldName) {
    return this.getConfig(tipoHorario).fields[field];
  }

  static processApiDefaults(tipoHorario: string | undefined, prev: any, apiData: any, hasExisting: boolean) {
    return this.getConfig(tipoHorario).processApiDefaults(prev, apiData, hasExisting);
  }

  static calculateNormalHours(tipoHorario: string | undefined, formData: any, apiData?: any, ctx?: { now?: Date }) {
    return this.getConfig(tipoHorario).calculateNormalHours(formData, apiData, ctx);
  }

  static calculateLunchHours(tipoHorario: string | undefined, formData: any) {
    return this.getConfig(tipoHorario).calculateLunchHours(formData);
  }

  static onFieldChange(
    tipoHorario: string | undefined,
    field: FieldName,
    nextValue: any,
    prevFormData: any,
    apiData?: any
  ) {
    const cfg = this.getConfig(tipoHorario);
    if (typeof cfg.onFieldChange === "function") {
      return cfg.onFieldChange(field, nextValue, prevFormData, apiData);
    }
    return { ...prevFormData, [field]: nextValue };
  }
}

export default HorarioRulesFactory;


