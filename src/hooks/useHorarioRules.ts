// Hook para consumir reglas de horario desde componentes
import { useMemo } from "react";
import { HorarioRulesFactory } from "../utils/horarioRules";
import type { FieldName, HorarioFormRulesConfig } from "../utils/horarioRules";

interface UseHorarioRulesProps {
  tipoHorario?: string | null;
  formData: any;
  apiData?: any;
}

export const useHorarioRules = ({ tipoHorario, formData, apiData }: UseHorarioRulesProps) => {
  const config: HorarioFormRulesConfig = useMemo(
    () => HorarioRulesFactory.getConfig(tipoHorario || undefined),
    [tipoHorario]
  );

  const utils = useMemo(
    () => ({
      isFieldVisible: (field: FieldName) =>
        HorarioRulesFactory.isFieldVisible(tipoHorario || undefined, field),
      isFieldEnabled: (field: FieldName) =>
        HorarioRulesFactory.isFieldEnabled(tipoHorario || undefined, field),
      getFieldConfig: (field: FieldName) =>
        HorarioRulesFactory.getFieldConfig(tipoHorario || undefined, field),
      processApiDefaults: (prev: any, hasExisting: boolean) =>
        HorarioRulesFactory.processApiDefaults(
          tipoHorario || undefined,
          prev,
          apiData,
          hasExisting
        ),
      calculateNormalHours: () =>
        HorarioRulesFactory.calculateNormalHours(
          tipoHorario || undefined,
          formData,
          apiData
        ),
      calculateLunchHours: () =>
        HorarioRulesFactory.calculateLunchHours(tipoHorario || undefined, formData),
      onFieldChange: (
        field: FieldName,
        nextValue: any,
        prevFormData: any
      ) =>
        HorarioRulesFactory.onFieldChange(
          tipoHorario || undefined,
          field,
          nextValue,
          prevFormData,
          apiData
        ),
    }),
    [tipoHorario, formData, apiData]
  );

  return { config, utils };
};

export default useHorarioRules;


