// src/dtos/calculoHorasTrabajoDto.ts

/**
 * Representa el horario de trabajo de un empleado en una fecha específica
 */
export interface HorarioTrabajoDto {
  tipoHorario: string; // H1, H2, etc.
  fecha: string;
  empleadoId: string;
  horarioTrabajo: {
    inicio: string;
    fin: string;
  };
  incluyeAlmuerzo: boolean;
  esDiaLibre: boolean;
  esFestivo: boolean;
  nombreDiaFestivo: string;
  cantidadHorasLaborables: number;
}

/**
 * Conteo de horas trabajadas por un empleado en un período
 */
export interface ConteoHorasTrabajadasDto {
  fechaInicio: string;
  fechaFin: string;
  empleadoId: string;
  cantidadHoras: {
    normal: number;
    p25: number; // 25% de recargo
    p50: number; // 50% de recargo
    p75: number; // 75% de recargo
    p100: number; // 100% de recargo (doble)
    libre: number; // 0 del valor de la hora normal
    almuerzo: number; // 0 del valor de la hora normal
  };
  // Campos adicionales que pueden venir del backend
  totalHorasTrabajadas?: number;
  totalHorasLaborables?: number;
  diasLaborados?: number;
  diasVacaciones?: number;
}

/**
/**
 * Tipos de intervalos en la línea de tiempo del día
 */
export type TipoIntervalo = "NORMAL" | "EXTRA" | "ALMUERZO" | "LIBRE";

/**
 * Representa un intervalo de tiempo en el día
 */
export interface IntervaloTiempo {
  horaInicio: string; // HH:mm format
  horaFin: string; // HH:mm format
  tipo: TipoIntervalo;
  jobId?: number; // Solo para NORMAL y EXTRA
  descripcion?: string;
}

/**
 * Línea de tiempo completa del día (24 horas)
 */
export interface LineaTiempoDia {
  fecha: string;
  empleadoId: string;
  intervalos: IntervaloTiempo[];
}
