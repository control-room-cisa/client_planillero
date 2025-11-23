import type { HorarioRuleEngine } from "./interfaces";

export const H2Rules: HorarioRuleEngine = {
  type: "H2",
  name: "Horario Flexible",
  config: {
    type: "H2",
    fields: {
      horaEntrada: { visible: true, enabled: true, required: true },
      horaSalida: { visible: true, enabled: true, required: true },
      jornada: { visible: true, enabled: true, required: true, defaultValue: "D" },
      esDiaLibre: { visible: true, enabled: true, required: false, defaultValue: false },
      esHoraCorrida: { visible: false, enabled: false, required: false, defaultValue: false },
      comentarioEmpleado: { visible: true, enabled: true, required: false },
    },
    calculateNormalHours: (formData, apiData, ctx) => {
      if (formData?.esDiaLibre || apiData?.esFestivo) return 0;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const s = timeToMinutes(formData.horaEntrada);
      let e = timeToMinutes(formData.horaSalida);
      if (e <= s) e += 24 * 60;
      return Math.max(0, (e - s) / 60); // sin almuerzo en H2
    },
    calculateLunchHours: () => 0,
    processApiDefaults: (prev, apiData, hasExisting) => {
      const next = { ...prev };
      if (!hasExisting) {
        next.esDiaLibre = Boolean(apiData?.esDiaLibre);
        if (!next.jornada) next.jornada = "D";
        if (next.jornada === "D") {
          next.horaEntrada = "07:00";
          next.horaSalida = "19:00";
        } else if (next.jornada === "N") {
          next.horaEntrada = next.horaEntrada || "19:00";
          next.horaSalida = next.horaSalida || "07:00";
        }
      }
      if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio) next.horaEntrada = apiData.horarioTrabajo.inicio;
      if (!prev.horaSalida && apiData?.horarioTrabajo?.fin) next.horaSalida = apiData.horarioTrabajo.fin;
      next.esHoraCorrida = false;
      return next;
    },
  },
};

export default H2Rules;


