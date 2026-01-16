import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H1_7
 *
 * Requisitos:
 * - Hora de entrada/salida EDITABLES
 * - Se carga hora guardada si hay, de lo contrario la hora generada por el horario
 * - Tiene botón de día libre usable por el usuario
 * - Al seleccionar día libre, se ponen todas las horas laborables en 0 (entrada==salida==07:00)
 */
export const H1_7Rules: HorarioRuleEngine = {
  type: "H1_7",
  name: "Horario H1_7 (7-19 todos los días)",
  config: {
    type: "H1_7",
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
        visible: true,
        enabled: true,
        required: false,
        defaultValue: false,
      },
      esHoraCorrida: {
        visible: true,
        enabled: false, // Deshabilitado en H1_7
        required: false,
        defaultValue: true, // Siempre true en H1_7 para 12 horas (7-19)
      },
      comentarioEmpleado: { visible: true, enabled: true, required: false },
    },
    calculateNormalHours: (formData, apiData) => {
      // Día libre: 0 horas
      if (formData?.esDiaLibre) return 0;
      // Feriado: 0 horas
      if (apiData?.esFestivo || formData?.esFestivo) return 0;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      if (formData.horaEntrada === formData.horaSalida) return 0;

      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const s = timeToMinutes(formData.horaEntrada);
      let e = timeToMinutes(formData.horaSalida);
      if (e <= s) e += 24 * 60;

      // Almuerzo: 1h si NO es hora corrida
      const almuerzo = formData.esHoraCorrida ? 0 : 1;
      return Math.max(0, (e - s) / 60 - almuerzo);
    },
    calculateLunchHours: (formData) => (formData.esHoraCorrida ? 0 : 1),
    processApiDefaults: (prev, apiData, hasExisting) => {
      const next = { ...prev };

      // Jornada siempre fija en "D"
      next.jornada = "D";
      // Hora Corrida siempre true en H1_7 (deshabilitado pero activo)
      next.esHoraCorrida = true;

      // Feriado: setear 07:00 - 07:00
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        next.esDiaLibre = true;
        return next;
      }

      // Si hay registro existente, usar los valores guardados
      if (hasExisting) {
        // Mantener los valores existentes, pero forzar esHoraCorrida a true
        next.esHoraCorrida = true;
        return next;
      }

      // Si no hay registro existente, cargar desde backend (horario generado)
      if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio) {
        next.horaEntrada = apiData.horarioTrabajo.inicio;
      }
      if (!prev.horaSalida && apiData?.horarioTrabajo?.fin) {
        next.horaSalida = apiData.horarioTrabajo.fin;
      }
      // Cargar esDiaLibre desde backend si está disponible
      if (apiData?.esDiaLibre !== undefined) {
        next.esDiaLibre = apiData.esDiaLibre;
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      const base = { ...prevFormData, jornada: "D", esHoraCorrida: true }; // Siempre true en H1_7

      // Si se activa/desactiva día libre, ajustar horas
      if (fieldName === "esDiaLibre") {
        if (nextValue === true) {
          // Activar día libre: poner entrada y salida en 07:00
          return {
            ...base,
            esDiaLibre: true,
            horaEntrada: "07:00",
            horaSalida: "07:00",
            esHoraCorrida: true, // Mantener true
          };
        } else {
          // Desactivar día libre: restaurar horario del backend si está disponible
          // Si no hay horario del backend, mantener los valores actuales
          return {
            ...base,
            esDiaLibre: false,
            esHoraCorrida: true, // Mantener true
          };
        }
      }

      // Si día libre está activo, no permitir cambios en horas
      if (base.esDiaLibre && (fieldName === "horaEntrada" || fieldName === "horaSalida")) {
        return base; // No cambiar nada si es día libre
      }

      // Hora Corrida: no permitir cambios (siempre true en H1_7)
      if (fieldName === "esHoraCorrida") {
        return base; // Ignorar cambios, mantener true
      }

      return { ...base, [fieldName]: nextValue };
    },
  },
};

export default H1_7Rules;

