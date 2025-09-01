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
      if (apiData?.cantidadHorasLaborables != null) return apiData.cantidadHorasLaborables;
      // Regla especial H2: martes de jornada nocturna = 6h
      const now = ctx?.now || new Date();
      if (formData?.jornada === "N" && now.getDay() === 2) return 6;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 8;
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
        next.jornada = "D";
        next.esDiaLibre = false;
      }
      if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio) next.horaEntrada = apiData.horarioTrabajo.inicio;
      if (!prev.horaSalida && apiData?.horarioTrabajo?.fin) next.horaSalida = apiData.horarioTrabajo.fin;
      next.esHoraCorrida = false;
      return next;
    },
  },
};

export default H2Rules;


