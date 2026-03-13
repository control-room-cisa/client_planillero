import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H1_7
 *
 * Requisitos:
 * - Hora de entrada/salida NO EDITABLES por el usuario.
 * - Las horas se cargan SIEMPRE desde el backend (horarioTrabajo.inicio / fin).
 *   Si existe un registro guardado para el día, sus horas se ignoran; prevalece el backend.
 * - Excepción: si el usuario activa "Día no laborable", entrada y salida se fijan en 07:00
 *   y las horas laborables pasan a 0.
 * - Botón de Día Libre deshabilitado en H1_7; el backend lo activa automáticamente
 *   (domingos / feriados → esDiaLibre = true desde el backend).
 * - Hora Corrida siempre true y deshabilitada (el horario 07:00-19:00 no descuenta almuerzo
 *   porque ya está incluido en las 12h laborables).
 *
 * EXCEPCIÓN CRÍTICA – DÍA LIBRE CON HORAS NORMALES:
 *   En H1_7, cuando esDiaLibre = true las horas normales se calculan IGUAL que un día normal
 *   (diferencia entrada - salida). Esto es porque los domingos son "día libre" pero el
 *   empleado sigue trabajando 12h (las extras se pagan al 100%).
 *   >>> ESTA EXCEPCIÓN SOLO APLICA A H1_7. <<<
 *   Ningún otro subtipo de H1 (H1_1, H1_2, etc.) debe permitir horas normales en día libre.
 *   Al pasar el filtro de supervisor y RRHH se debe contemplar esta condición especial
 *   para H1_7: un registro con esDiaLibre = true Y horas normales > 0 es VÁLIDO.
 *
 * COMENTARIO (comentarioEmpleado):
 * - Visible y editable (enabled: true). Opcional (required: false).
 * - El empleado puede agregar un comentario al registro del día.
 * - El valor se envía al backend en el upsert del registro diario y se usa en el dominio
 *   de cálculo de horas (H1Base) como comentario asociado cuando no hay descripción por actividad.
 * - No se aplican restricciones de longitud ni formato en esta regla.
 */
export const H1_7Rules: HorarioRuleEngine = {
  type: "H1_7",
  name: "Horario H1_7 (7-19 todos los días)",
  config: {
    type: "H1_7",
    fields: {
      horaEntrada: {
        visible: true,
        enabled: false, // Solo lectura: siempre proviene del backend
        required: true,
        helperText: "Se llena automáticamente desde el horario asignado",
      },
      horaSalida: {
        visible: true,
        enabled: false, // Solo lectura: siempre proviene del backend
        required: true,
        helperText: "Se llena automáticamente desde el horario asignado",
      },
      jornada: {
        visible: false,
        enabled: false,
        required: false,
        defaultValue: "D",
      },
      esDiaLibre: {
        visible: true,
        enabled: false, // Solo lectura: lo activa el backend (domingo/feriado)
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
      if (formData?.esIncapacidad) return 0;
      // Día no laborable (client-only): 0 horas
      if (formData?.esDiaNoLaborable) return 0;
      // Feriado: 0 horas
      if (apiData?.esFestivo || formData?.esFestivo) return 0;

      // EXCEPCIÓN H1_7: esDiaLibre = true NO reduce las horas normales a 0.
      // Los domingos son "día libre" pero el empleado trabaja 12h igualmente;
      // las horas extras se pagan al 100%.
      // >>> En NINGÚN otro subtipo de H1 se permite esto. Solo H1_7. <<<

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
    processApiDefaults: (prev, apiData, _hasExisting) => {
      const next = { ...prev };

      // Invariantes H1_7
      next.jornada = "D";
      next.esHoraCorrida = true;

      // Día libre siempre desde backend (domingo / feriado)
      next.esDiaLibre = Boolean(apiData?.esDiaLibre);

      // Si el usuario había activado "Día no laborable", respetar las horas colapsadas
      if (prev.esDiaNoLaborable) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        return next;
      }

      // Feriado: colapsar horas a 07:00-07:00
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        return next;
      }

      // Siempre cargar desde el backend, sin importar si hay registro guardado
      if (apiData?.horarioTrabajo?.inicio) {
        next.horaEntrada = apiData.horarioTrabajo.inicio;
      }
      if (apiData?.horarioTrabajo?.fin) {
        next.horaSalida = apiData.horarioTrabajo.fin;
      }

      return next;
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      // Mantener invariantes H1_7 en cualquier cambio
      const base = { ...prevFormData, jornada: "D", esHoraCorrida: true };

      // Hora entrada/salida y hora corrida no son editables por el usuario
      if (
        fieldName === "horaEntrada" ||
        fieldName === "horaSalida" ||
        fieldName === "esHoraCorrida"
      ) {
        return base;
      }

      // esDiaLibre lo gestiona el backend; no se permite cambio manual
      if (fieldName === "esDiaLibre") {
        return base;
      }

      return { ...base, [fieldName]: nextValue };
    },
  },
};

export default H1_7Rules;

