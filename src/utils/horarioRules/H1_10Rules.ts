import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H1_10 (Horario libre UI)
 *
 * Sin plantilla de backend: el usuario define todo en la UI.
 *
 * - Hora entrada/salida: EDITABLES (sin defaults predefinidos)
 * - Jornada (D/N): VISIBLE y seleccionable; NO sugiere horas al cambiar
 * - Día libre: VISIBLE y editable (persiste en backend)
 * - Día no laborable: client-only (07:00–07:00 → 0h) vía useDailyTimesheet
 * - Incapacidad: común a todos los tipos
 * - Hora corrida: igual que H1_4 (±60 min salida si NO es turno nocturno)
 * - Feriado: forzar 07:00–07:00 (0 horas)
 */
export const H1_10Rules: HorarioRuleEngine = {
  type: "H1_10",
  name: "Horario libre UI",
  config: {
    type: "H1_10",
    fields: {
      horaEntrada: { visible: true, enabled: true, required: true },
      horaSalida: { visible: true, enabled: true, required: true },
      jornada: {
        visible: true,
        enabled: true,
        required: true,
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
      if (formData?.esIncapacidad) return 0;
      if (apiData?.esFestivo || formData?.esFestivo) return 0;
      if (formData?.esDiaLibre) return 0;
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

      if (!next.jornada) next.jornada = "D";
      if (typeof next.esDiaNoLaborable !== "boolean")
        next.esDiaNoLaborable = false;

      // Feriado: 0 horas y día libre
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        next.esDiaLibre = true;
        return next;
      }

      // Sin plantilla: no rellenar horas desde backend.
      // Solo defaults mínimos si no hay registro.
      if (!hasExisting) {
        next.esDiaLibre = false;
        if (!prev.horaEntrada) next.horaEntrada = "";
        if (!prev.horaSalida) next.horaSalida = "";
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      const base = { ...prevFormData };

      // Jornada: solo cambia el flag; NO sugiere horas (sin plantilla).
      if (fieldName === "jornada") {
        return { ...base, jornada: nextValue };
      }

      // Día libre: el colapso/restauración de horas lo hace useDailyTimesheet.
      if (fieldName === "esDiaLibre") {
        return { ...base, esDiaLibre: nextValue };
      }

      if (fieldName !== "esHoraCorrida") {
        return { ...base, [fieldName]: nextValue };
      }

      // Hora corrida: igual que H1_4 (±60 min salida si diurno)
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

export default H1_10Rules;
