import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H2 (Horario Flexible)
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
 *    - En H2: Cuando esIncapacidad = true, el checkbox de Día Libre se deshabilita
 *      y no puede ser manipulado. Esto evita conflictos entre incapacidad y día libre.
 *
 * 3. HORAS NORMALES:
 *    - Si entrada == salida, retornar 0 horas (comportamiento igual que H1).
 *    - Si entrada != salida, calcular: (horaSalida - horaEntrada) sin descuento de almuerzo.
 *    - H2 NO tiene descuento de almuerzo (calculateLunchHours siempre retorna 0).
 *
 * 4. JORNADA:
 *    - Valores posibles: "D" (Día) o "N" (Noche).
 *    - Por defecto: "D" con horario 07:00 - 19:00.
 *    - Noche: 19:00 - 07:00 (cruza medianoche).
 *
 * 5. HORA CORRIDA:
 *    - NO aplica a H2 (siempre false, campo oculto y deshabilitado).
 *
 * 6. FERIADO (esFestivo):
 *    - Cuando esFestivo = true, se establecen horaEntrada y horaSalida a "07:00".
 *    - Las horas laborables se calculan como diferencia: (horaSalida - horaEntrada).
 *    - Como ambas horas son iguales (7:00 - 7:00), el resultado es 0 horas laborables.
 *    - NO se asignan 0 horas arbitrariamente; se justifican mediante el cálculo de diferencia.
 *    - Los campos de hora entrada/salida se deshabilitan automáticamente.
 *    - RAZÓN: Un día feriado no tiene horas laborables, pero debe justificarse mediante cálculo.
 *
 * NOTA PARA IA: No modificar estos comportamientos sin revisar primero el impacto
 * en DailyTimesheet.tsx y otros componentes que dependen de estas reglas.
 */
export const H2Rules: HorarioRuleEngine = {
  type: "H2",
  name: "Horario Flexible",
  config: {
    type: "H2",
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
        visible: false,
        enabled: false,
        required: false,
        defaultValue: false,
      },
      comentarioEmpleado: { visible: true, enabled: true, required: false },
    },
    calculateNormalHours: (formData, apiData) => {
      // Si es feriado, calcular desde diferencia de horas (debe dar 0 cuando ambas son 7:00)
      if (apiData?.esFestivo || formData?.esFestivo) {
        if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
        // Si entrada == salida, retornar 0 horas
        if (formData.horaEntrada === formData.horaSalida) return 0;
        const timeToMinutes = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        const s = timeToMinutes(formData.horaEntrada);
        let e = timeToMinutes(formData.horaSalida);
        if (e <= s) e += 24 * 60;
        return Math.max(0, (e - s) / 60);
      }
      if (formData?.esDiaLibre) return 0;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 0;
      // Si entrada == salida, retornar 0 horas (igual que H1)
      if (formData.horaEntrada === formData.horaSalida) return 0;
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
      // Si es feriado, establecer ambas horas a 7:00 para que el cálculo dé 0 horas laborables
      if (apiData?.esFestivo) {
        next.horaEntrada = "07:00";
        next.horaSalida = "07:00";
        if (!hasExisting) {
          next.esDiaLibre = Boolean(apiData?.esDiaLibre);
          if (!next.jornada) next.jornada = "D";
        }
        next.esHoraCorrida = false;
        return next;
      }
      if (!hasExisting) {
        next.esDiaLibre = Boolean(apiData?.esDiaLibre);
        if (!next.jornada) next.jornada = "D";
        if (next.jornada === "D") {
          next.horaEntrada = "07:00";
          next.horaSalida = "19:00";
        } else if (next.jornada === "N") {
          next.horaEntrada = next.horaEntrada || "19:00";
          next.horaSalida = next.horaSalida || "07:00";
        }
      }
      if (!prev.horaEntrada && apiData?.horarioTrabajo?.inicio)
        next.horaEntrada = apiData.horarioTrabajo.inicio;
      if (!prev.horaSalida && apiData?.horarioTrabajo?.fin)
        next.horaSalida = apiData.horarioTrabajo.fin;
      next.esHoraCorrida = false;
      return next;
    },
  },
};

export default H2Rules;
