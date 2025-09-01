import { DefaultRules } from "./DefaultRules";
import { H1Rules } from "./H1Rules";
import { H2Rules } from "./H2Rules";
import type { FieldName, HorarioFormRulesConfig, HorarioRuleEngine } from "./interfaces";

const registry = new Map<string, HorarioRuleEngine>([
  [H1Rules.type, H1Rules],
  [H2Rules.type, H2Rules],
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
}

export default HorarioRulesFactory;


