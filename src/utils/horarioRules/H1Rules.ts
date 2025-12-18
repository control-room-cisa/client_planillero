import type { HorarioRuleEngine } from "./interfaces";

/**
 * REGLAS DE NEGOCIO PARA HORARIO H1 (Horario Fijo)
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
 * 
 * 4. HORA CORRIDA (esHoraCorrida):
 *    - Solo aplica a H1 (no a H2).
 *    - Cuando se activa/desactiva, ajusta automáticamente la hora de salida ±60 minutos.
 *    - Mantiene las horas laborables constantes.
 * 
 * NOTA PARA IA: No modificar estos comportamientos sin revisar primero el impacto
 * en DailyTimesheet.tsx y otros componentes que dependen de estas reglas.
 */
export const H1Rules: HorarioRuleEngine = {
  type: "H1",
  name: "Horario Fijo",
  config: {
    type: "H1",
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
      if (apiData?.cantidadHorasLaborables != null)
        return apiData.cantidadHorasLaborables;
      if (apiData?.horasNormales != null) return apiData.horasNormales;
      if (!formData?.horaEntrada || !formData?.horaSalida) return 8;
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
      return {
        ...prev,
        horaEntrada: apiData?.horarioTrabajo?.inicio || prev.horaEntrada || "",
        horaSalida: apiData?.horarioTrabajo?.fin || prev.horaSalida || "",
        jornada: hasExisting ? prev.jornada : "D",
        esDiaLibre: hasExisting
          ? prev.esDiaLibre
          : apiData?.esDiaLibre || false,
      };
    },
    onFieldChange: (fieldName, nextValue, prevFormData) => {
      if (fieldName !== "esHoraCorrida")
        return { ...prevFormData, [fieldName]: nextValue };
      // Solo ajustar en H1 cuando NO es turno nocturno
      const timeToMinutes = (t: string) => {
        const [h, m] = String(t || "")
          .split(":")
          .map(Number);
        return h * 60 + m;
      };
      const entrada = prevFormData.horaEntrada;
      const salida = prevFormData.horaSalida;
      if (!entrada || !salida)
        return { ...prevFormData, [fieldName]: nextValue };
      const s = timeToMinutes(entrada);
      let e = timeToMinutes(salida);
      const esTurnoNoche = s > e;
      if (esTurnoNoche) return { ...prevFormData, [fieldName]: nextValue };
      // Ajuste ±60 minutos manteniendo horas laborables constantes
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
        horaSalida: `${hours}:${mins}`,
      };
    },
  },
};

export default H1Rules;
