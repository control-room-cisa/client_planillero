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
  };
}
