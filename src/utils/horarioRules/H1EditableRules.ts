import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIOS H1 "EDITABLES" (ej: H1_4)
 *
 * Requisitos:
 * - Hora de entrada/salida EDITABLES
 * - Jornada OCULTA y forzada a "D"
 * - Día Libre OCULTO (siempre false en UI; estos turnos no lo usan)
 * - Hora Corrida igual que H1_1 (ajusta horaSalida ±60 min cuando NO es turno nocturno)
 * - Feriados: forzar 07:00 - 07:00 (0 horas) y se deshabilitan campos en el hook
 * - Campo client-only esDiaNoLaborable: si true, horas normales = 0 (entrada==salida==07:00)
 */
export const H1EditableRules: HorarioRuleEngine = {
  // Engine base; se registran alias por tipo (H1_4, etc.) en HorarioRulesFactory.
  type: "H1_4",
  name: "Horario H1 editable",
  config: {
    type: "H1_4",
    fields: {
      horaEntrada: { visible: true, enabled: true, required: true },
      horaSalida: { visible: true, enabled: true, required: true },
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
      // Feriado: 0 horas.
      if (apiData?.esFestivo || formData?.esFestivo) return 0;
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

      // Almuerzo: 1h si NO es hora corrida.
      const almuerzo = formData.esHoraCorrida ? 0 : 1;
      return Math.max(0, (e - s) / 60 - almuerzo);
    },
    calculateLunchHours: (formData) => (formData.esHoraCorrida ? 0 : 1),
    processApiDefaults: (prev, apiData, hasExisting) => {
      const next = { ...prev };

      // Jornada siempre fija en "D"
      next.jornada = "D";
      // Día libre oculto, por defecto false
      next.esDiaLibre = false;
      // Campo client-only: default false
      if (typeof next.esDiaNoLaborable !== "boolean")
        next.esDiaNoLaborable = false;

      // Feriado: setear 07:00 - 07:00
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        return next;
      }

      // Si no hay registro existente, cargar desde backend
      if (!hasExisting) {
        if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio) {
          next.horaEntrada = apiData.horarioTrabajo.inicio;
        }
        if (!prev.horaSalida && apiData?.horarioTrabajo?.fin) {
          next.horaSalida = apiData.horarioTrabajo.fin;
        }
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      // Jornada siempre D en estos tipos.
      const base = { ...prevFormData, jornada: "D", esDiaLibre: false };

      // Hora Corrida: igual que H1_1, pero no ajustar si entrada==salida (0 horas) o no hay datos.
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
      return {
        ...base,
        esHoraCorrida: nextValue,
        horaSalida: `${hours}:${mins}`,
      };
    },
  },
};

export default H1EditableRules;
