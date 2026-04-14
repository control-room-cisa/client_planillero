import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO DEFAULT (Horario Estándar)
 *
 * IMPORTANTE - COMPORTAMIENTOS CRÍTICOS QUE NO DEBEN ALTERARSE:
 *
 * 1. INCAPACIDAD (esIncapacidad):
 *    - Cuando esIncapacidad = true, NO se pueden crear, editar ni eliminar actividades.
 *    - Este comportamiento se implementa en DailyTimesheet.tsx mediante la variable `disableActivities`.
 *    - Los botones de "Nueva Actividad", "Editar" y "Eliminar" se deshabilitan automáticamente.
 *    - Esto aplica a TODOS los tipos de horarios (H1, H2, H1_1, H1_2, etc.).
 *    - RAZÓN: Un empleado en incapacidad no puede registrar actividades laborales.
 *
 * 2. DÍA LIBRE (esDiaLibre):
 *    - Cuando esDiaLibre = true, las horas normales se calculan como 0.
 *    - Los campos de hora entrada/salida se deshabilitan.
 *
 * 3. HORAS NORMALES:
 *    - Se calculan desde la API (cantidadHorasLaborables) cuando está disponible.
 *    - Si no hay datos de API, se calcula: (horaSalida - horaEntrada) - almuerzo.
 *    - El almuerzo es 1 hora si NO es hora corrida, 0 horas si es hora corrida.
 *    - Por defecto: 8 horas si no hay datos de entrada/salida.
 *
 * 4. FERIADO (esFestivo desde API):
 *    - Las horas normales del día son siempre 0 (no dependen de horaEntrada/horaSalida en UI).
 *    - En primera carga, processApiDefaults fija 07:00-07:00 para coherencia visual.
 *    - Si el usuario marca/desmarca día libre u otros flags, el feriado sigue implicando 0 horas normales.
 *
 * NOTA PARA IA: No modificar estos comportamientos sin revisar primero el impacto
 * en DailyTimesheet.tsx y otros componentes que dependen de estas reglas.
 */
export const DefaultRules: HorarioRuleEngine = {
  type: "DEFAULT",
  name: "Horario Estándar",
  config: {
    type: "DEFAULT",
    fields: {
      horaEntrada: { visible: true, enabled: true, required: true },
      horaSalida: { visible: true, enabled: true, required: true },
      jornada: {
        visible: true,
        enabled: true,
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
      if (formData?.esIncapacidad) return 0;
      // Feriado (API): siempre 0 horas normales aunque entrada/salida difieran tras toggles en UI
      if (apiData?.esFestivo || formData?.esFestivo) return 0;
      // Regla: NO inventar horas. Siempre justificar con (salida-entrada) y hora corrida.
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
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
      // Si es feriado, establecer ambas horas a 7:00 para que el cálculo dé 0 horas laborables
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        if (!hasExisting) {
          next.jornada = "D";
          next.esDiaLibre = false;
        }
        return next;
      }
      if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio)
        next.horaEntrada = apiData.horarioTrabajo.inicio;
      if (!prev.horaSalida && apiData?.horarioTrabajo?.fin)
        next.horaSalida = apiData.horarioTrabajo.fin;
      if (!hasExisting) {
        next.jornada = "D";
        next.esDiaLibre = false;
      }
      return next;
    },
  },
};

export default DefaultRules;
