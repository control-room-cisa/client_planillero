import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H2_2
 *
 * Objetivo: comportamiento más similar a H1_1, pero:
 * - Hora de entrada/salida EDITABLES
 * - Jornada OCULTA (siempre "D")
 * - Hora Corrida seleccionable (misma lógica que H1_1)
 * - Día Libre: al activarse, forzar horaEntrada/horaSalida = "07:00"
 *   (en ese caso no importa el traslape de actividades con el rango)
 */
export const H2_2Rules: HorarioRuleEngine = {
  type: "H2_2",
  name: "Horario H2.2",
  config: {
    type: "H2_2",
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
        enabled: true,
        required: false,
        defaultValue: false,
      },
      comentarioEmpleado: { visible: true, enabled: true, required: false },
    },
    calculateNormalHours: (formData, apiData) => {
      // Día libre: 0 horas normales.
      if (formData?.esDiaLibre) return 0;
      // Feriado: 0 horas normales.
      if (apiData?.esFestivo || formData?.esFestivo) return 0;

      // Para H2_2, las horas normales esperadas vienen del backend.
      // Si el backend no retorna cantidadHorasLaborables, usar 0 por defecto.
      if (apiData?.cantidadHorasLaborables != null) return apiData.cantidadHorasLaborables;
      if (apiData?.horasNormales != null) return apiData.horasNormales;
      return 0;
    },
    calculateLunchHours: (formData) => (formData.esHoraCorrida ? 0 : 1),
    processApiDefaults: (prev, apiData, hasExisting) => {
      const next = { ...prev };

      // Jornada siempre fija en "D"
      next.jornada = "D";

      // Si es feriado, establecer ambas horas a 7:00 (0 horas por diferencia).
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        if (!hasExisting) {
          next.esDiaLibre = false;
        }
        return next;
      }

      // Defaults desde API (horarioTrabajo) solo cuando NO hay registro existente
      // (cuando hay existente, se respeta el registro en useDailyTimesheet).
      if (!hasExisting) {
        if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio) {
          next.horaEntrada = apiData.horarioTrabajo.inicio;
        }
        if (!prev.horaSalida && apiData?.horarioTrabajo?.fin) {
          next.horaSalida = apiData.horarioTrabajo.fin;
        }
        next.esDiaLibre = Boolean(apiData?.esDiaLibre);
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData, apiData) => {
      // Día Libre: forzar 07:00-07:00 y desactivar hora corrida (no aplica).
      if (fieldName === "esDiaLibre") {
        if (typeof nextValue === "boolean" && nextValue) {
          return {
            ...prevFormData,
            esDiaLibre: true,
            horaEntrada: "07:00",
            horaSalida: "07:00",
            jornada: "D",
            esHoraCorrida: false,
          };
        }
        // Al desactivar día libre, intentar restaurar el horario del backend si existe.
        const inicio = apiData?.horarioTrabajo?.inicio;
        const fin = apiData?.horarioTrabajo?.fin;
        return {
          ...prevFormData,
          esDiaLibre: false,
          jornada: "D",
          ...(inicio ? { horaEntrada: inicio } : {}),
          ...(fin ? { horaSalida: fin } : {}),
        };
      }

      // Hora Corrida: misma lógica que H1_1 (ajusta horaSalida ±60 si NO es turno nocturno).
      if (fieldName !== "esHoraCorrida") {
        return { ...prevFormData, [fieldName]: nextValue };
      }

      const timeToMinutes = (t: string) => {
        const [h, m] = String(t || "")
          .split(":")
          .map(Number);
        return h * 60 + m;
      };

      const entrada = prevFormData.horaEntrada;
      const salida = prevFormData.horaSalida;
      if (!entrada || !salida) return { ...prevFormData, [fieldName]: nextValue };

      const s = timeToMinutes(entrada);
      let e = timeToMinutes(salida);
      const esTurnoNoche = s > e;
      if (esTurnoNoche) return { ...prevFormData, [fieldName]: nextValue };

      e = typeof nextValue === "boolean" && nextValue ? e - 60 : e + 60;
      if (e < 0) e += 1440;
      if (e >= 1440) e -= 1440;

      const hours = Math.floor(e / 60)
        .toString()
        .padStart(2, "0");
      const mins = (e % 60).toString().padStart(2, "0");

      return {
        ...prevFormData,
        esHoraCorrida: nextValue,
        jornada: "D",
        horaSalida: `${hours}:${mins}`,
      };
    },
  },
};

export default H2_2Rules;


