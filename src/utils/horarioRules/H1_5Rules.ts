import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H1_5
 *
 * Requisitos:
 * - Hora entrada/salida NO editable (se carga del backend)
 * - Día libre visible pero NO seleccionable (se carga del backend)
 * - Día no laborable (client-only) funciona como H1_4: fuerza 07:00-07:00 (0 horas)
 * - Jornada oculta, por defecto día ("D")
 * - Hora corrida igual que H1_1 (ajusta horaSalida ±60 min cuando NO es turno nocturno)
 * - Feriados: 07:00-07:00 y no editable
 */
export const H1_5Rules: HorarioRuleEngine = {
  type: "H1_5",
  name: "Horario H1.5",
  config: {
    type: "H1_5",
    fields: {
      horaEntrada: { visible: true, enabled: false, required: true },
      horaSalida: { visible: true, enabled: false, required: true },
      jornada: {
        visible: false,
        enabled: false,
        required: false,
        defaultValue: "D",
      },
      esDiaLibre: {
        visible: true,
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
      // Feriado: 0 horas.
      if (apiData?.esFestivo || formData?.esFestivo) return 0;
      // Día libre (desde backend): 0 horas.
      if (formData?.esDiaLibre) return 0;
      // Día no laborable (client-only): 0 horas.
      if (formData?.esDiaNoLaborable) return 0;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      if (formData.horaEntrada === formData.horaSalida) return 0;

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

      next.jornada = "D";
      // Día libre viene del backend y se muestra, pero no se puede cambiar.
      next.esDiaLibre = Boolean(apiData?.esDiaLibre);
      // Client-only default
      if (typeof next.esDiaNoLaborable !== "boolean") next.esDiaNoLaborable = false;

      // Feriado: setear 07:00 - 07:00 (0 horas por diferencia)
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        return next;
      }

      // Cargar siempre del backend cuando no hay registro existente.
      // Si hay registro existente, useDailyTimesheet setea desde el registro.
      if (!hasExisting) {
        next.horaEntrada = apiData?.horarioTrabajo?.inicio || next.horaEntrada || "";
        next.horaSalida = apiData?.horarioTrabajo?.fin || next.horaSalida || "";
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      // Base: jornada fija en día.
      const base = { ...prevFormData, jornada: "D" };

      if (fieldName !== "esHoraCorrida") {
        return { ...base, [fieldName]: nextValue };
      }

      const entrada = base.horaEntrada;
      const salida = base.horaSalida;
      if (!entrada || !salida) return { ...base, esHoraCorrida: nextValue };
      if (entrada === salida) return { ...base, esHoraCorrida: nextValue };

      const timeToMinutes = (t: string) => {
        const [h, m] = String(t || "")
          .split(":")
          .map(Number);
        return h * 60 + m;
      };
      const s = timeToMinutes(entrada);
      let e = timeToMinutes(salida);
      const esTurnoNoche = s > e;
      if (esTurnoNoche) return { ...base, esHoraCorrida: nextValue };

      e = typeof nextValue === "boolean" && nextValue ? e - 60 : e + 60;
      if (e < 0) e += 1440;
      if (e >= 1440) e -= 1440;

      const hours = Math.floor(e / 60)
        .toString()
        .padStart(2, "0");
      const mins = (e % 60).toString().padStart(2, "0");
      return { ...base, esHoraCorrida: nextValue, horaSalida: `${hours}:${mins}` };
    },
  },
};

export default H1_5Rules;


