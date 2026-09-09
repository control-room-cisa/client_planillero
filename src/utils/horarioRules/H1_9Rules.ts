import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H1_9 (Especial Lunes a Sábado)
 *
 * Réplica de H1_1 con:
 * - Hora de entrada/salida EDITABLES
 * - Día Libre visible (solo lectura; backend lo activa domingo/feriado)
 * - Hora Corrida igual que H1_1 (ajusta horaSalida ±60 min cuando NO es turno nocturno)
 * - Feriados / día libre: 07:00–07:00
 *
 * Horario por defecto (backend):
 * - Lun–Jue: 07:00–17:00
 * - Vie:     07:00–16:00
 * - Sáb:     07:00–12:00
 * - Dom:     libre
 */
export const H1_9Rules: HorarioRuleEngine = {
  type: "H1_9",
  name: "Horario H1.9 Especial Lunes a Sábado",
  config: {
    type: "H1_9",
    fields: {
      horaEntrada: {
        visible: true,
        enabled: true,
        required: true,
      },
      horaSalida: {
        visible: true,
        enabled: true,
        required: true,
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
      if (formData?.esIncapacidad) return 0;
      if (apiData?.esFestivo || formData?.esFestivo) return 0;
      if (formData?.esDiaLibre) return 0;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      if (formData.horaEntrada === formData.horaSalida) return 0;

      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const s = timeToMinutes(formData.horaEntrada);
      let e = timeToMinutes(formData.horaSalida);
      if (e <= s) e += 24 * 60;

      // Almuerzo solo si el turno cubre 12:00–13:00 y no es hora corrida
      // (sábado 07–12 no cubre almuerzo → 5h).
      const cubreAlmuerzo = s < 13 * 60 && e > 12 * 60;
      const almuerzo = formData.esHoraCorrida || !cubreAlmuerzo ? 0 : 1;
      return Math.max(0, (e - s) / 60 - almuerzo);
    },
    calculateLunchHours: (formData) => {
      if (formData.esHoraCorrida) return 0;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      if (formData.horaEntrada === formData.horaSalida) return 0;
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const s = timeToMinutes(formData.horaEntrada);
      let e = timeToMinutes(formData.horaSalida);
      if (e <= s) e += 24 * 60;
      const cubreAlmuerzo = s < 13 * 60 && e > 12 * 60;
      return cubreAlmuerzo ? 1 : 0;
    },
    processApiDefaults: (prev, apiData, hasExisting) => {
      const next = { ...prev };

      next.jornada = "D";
      next.esDiaLibre = Boolean(apiData?.esDiaLibre);

      if (apiData?.esFestivo || apiData?.esDiaLibre) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        return next;
      }

      // Si no hay registro existente, cargar defaults del backend
      if (!hasExisting) {
        if (apiData?.horarioTrabajo?.inicio) {
          next.horaEntrada = apiData.horarioTrabajo.inicio;
        }
        if (apiData?.horarioTrabajo?.fin) {
          next.horaSalida = apiData.horarioTrabajo.fin;
        }
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      const base = { ...prevFormData, jornada: "D" };

      // Día libre lo gestiona el backend; no permitir cambio manual
      if (fieldName === "esDiaLibre") {
        return base;
      }

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

export default H1_9Rules;
