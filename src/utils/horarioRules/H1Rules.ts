import type { HorarioRuleEngine } from "./interfaces";

export const H1Rules: HorarioRuleEngine = {
  type: "H1",
  name: "Horario Fijo",
  config: {
    type: "H1",
    fields: {
      horaEntrada: {
        visible: true,
        enabled: false,
        required: true,
        helperText: "Se llena automáticamente",
      },
      horaSalida: {
        visible: true,
        enabled: false,
        required: true,
        helperText: "Se llena automáticamente",
      },
      jornada: {
        visible: false,
        enabled: false,
        required: false,
        defaultValue: "D",
      },
      esDiaLibre: {
        visible: false,
        enabled: false,
        required: false,
        defaultValue: false,
      },
      esHoraCorrida: {
        visible: true,
        enabled: true,
        required: false,
        defaultValue: false,
      },
      comentarioEmpleado: { visible: true, enabled: true, required: false },
    },
    calculateNormalHours: (formData, apiData) => {
      if (apiData?.cantidadHorasLaborables != null)
        return apiData.cantidadHorasLaborables;
      if (apiData?.horasNormales != null) return apiData.horasNormales;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 8;
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const s = timeToMinutes(formData.horaEntrada);
      let e = timeToMinutes(formData.horaSalida);
      if (e <= s) e += 24 * 60;
      const almuerzo = formData.esHoraCorrida ? 0 : 1;
      return Math.max(0, (e - s) / 60 - almuerzo);
    },
    calculateLunchHours: (formData) => (formData.esHoraCorrida ? 0 : 1),
    processApiDefaults: (prev, apiData, hasExisting) => {
      return {
        ...prev,
        horaEntrada: apiData?.horarioTrabajo?.inicio || prev.horaEntrada || "",
        horaSalida: apiData?.horarioTrabajo?.fin || prev.horaSalida || "",
        jornada: hasExisting ? prev.jornada : "D",
        esDiaLibre: hasExisting ? prev.esDiaLibre : false,
      };
    },
  },
};

export default H1Rules;
