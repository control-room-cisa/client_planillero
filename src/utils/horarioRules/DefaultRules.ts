import type { HorarioRuleEngine } from "./interfaces";

export const DefaultRules: HorarioRuleEngine = {
  type: "DEFAULT",
  name: "Horario Estándar",
  config: {
    type: "DEFAULT",
    fields: {
      horaEntrada: { visible: true, enabled: true, required: true },
      horaSalida: { visible: true, enabled: true, required: true },
      jornada: { visible: true, enabled: true, required: false, defaultValue: "D" },
      esDiaLibre: { visible: true, enabled: true, required: false, defaultValue: false },
      esHoraCorrida: { visible: true, enabled: true, required: false, defaultValue: false },
      comentarioEmpleado: { visible: true, enabled: true, required: false },
    },
    calculateNormalHours: (formData, apiData) => {
      if (apiData?.cantidadHorasLaborables != null) return apiData.cantidadHorasLaborables;
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
      const next = { ...prev };
      if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio) next.horaEntrada = apiData.horarioTrabajo.inicio;
      if (!prev.horaSalida && apiData?.horarioTrabajo?.fin) next.horaSalida = apiData.horarioTrabajo.fin;
      if (!hasExisting) {
        next.jornada = "D";
        next.esDiaLibre = false;
      }
      return next;
    },
  },
};

export default DefaultRules;


