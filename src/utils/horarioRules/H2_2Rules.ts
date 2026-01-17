import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H2_2
 *
 * Objetivo: comportamiento más similar a H1_1, pero:
 * - Hora de entrada/salida NO editables (se cargan desde la política del backend)
 * - Jornada OCULTA (siempre "D")
 * - Hora Corrida seleccionable (misma lógica que H1_1)
 * - Día Libre NO editable (lo determina el backend por fin de semana/feriado)
 */
export const H2_2Rules: HorarioRuleEngine = {
  type: "H2_2",
  name: "Horario H2.2",
  config: {
    type: "H2_2",
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
      // Incapacidad: no exigir horas normales en UI (no se registran actividades).
      if (formData?.esIncapacidad) return 0;
      // Día libre: 0 horas normales.
      if (formData?.esDiaLibre) return 0;
      // Feriado: 0 horas normales.
      if (apiData?.esFestivo || formData?.esFestivo) return 0;

      // H2_2: igual que H1_1 para el conteo de horas normales:
      // horas = (horaSalida - horaEntrada) - 1h almuerzo cuando NO es hora corrida.
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      if (formData.horaEntrada === formData.horaSalida) return 0;

      const timeToMinutes = (t: string) => {
        const [h, m] = String(t || "")
          .split(":")
          .map(Number);
        return h * 60 + m;
      };

      const s = timeToMinutes(formData.horaEntrada);
      let e = timeToMinutes(formData.horaSalida);
      if (e <= s) e += 24 * 60;

      const almuerzo = formData.esHoraCorrida ? 0 : 1;
      return Math.max(0, (e - s) / 60 - almuerzo);
    },
    calculateLunchHours: (formData) => (formData.esHoraCorrida ? 0 : 1),
    processApiDefaults: (prev, apiData, _hasExisting) => {
      const next = { ...prev };

      // Jornada siempre fija en "D"
      next.jornada = "D";

      // H2_2: siempre tomar el horario generado por backend (aunque exista registro diario).
      if (apiData?.horarioTrabajo?.inicio) {
        next.horaEntrada = apiData.horarioTrabajo.inicio;
      }
      if (apiData?.horarioTrabajo?.fin) {
        next.horaSalida = apiData.horarioTrabajo.fin;
      }
      // Día libre lo define backend (fin de semana / feriado).
      next.esDiaLibre = Boolean(apiData?.esDiaLibre);

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData, _apiData) => {
      // Hora Corrida en H2_2 SOLO afecta el descuento de almuerzo (no debe alterar el horario fijo).
      if (fieldName === "esHoraCorrida") {
        return { ...prevFormData, esHoraCorrida: nextValue, jornada: "D" };
      }

      return { ...prevFormData, [fieldName]: nextValue };
    },
  },
};

export default H2_2Rules;
