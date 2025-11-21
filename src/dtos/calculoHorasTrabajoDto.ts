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
 * Errores de validación para el conteo de horas
 */
export interface ConteoHorasValidationErrorDto {
  fechasNoAprobadas: string[]; // Fechas que no han sido aprobadas por supervisor
  fechasSinRegistro: string[]; // Fechas que no tienen registro diario creado
}

export interface DeduccionAlimentacionDetalleDto {
  producto: string;
  precio: number;
  fecha: string;
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
    // Variantes por jobs especiales en horas NORMALES
    incapacidadCubreEmpresaHoras?: number; // E01 primeros 3 días consecutivos
    incapacidadCubreIHSSHoras?: number; // E01 del día 4 en adelante
    vacaciones?: number; // E02
    permisoConSueldo?: number; // E03
    permisoConSueldoHoras?: number; // E03 (alias para compatibilidad)
    permisoSinSueldo?: number; // E04
    inasistencias?: number; // E05
    llegadasTarde?: number; // E05
    compensatorio?: number; // E06 y E07
  };
  /**
   * Conteo agregado en días para el período. Base 15 días por período.
   * La suma debe cumplir: 15 = diasLaborados + vacaciones + permisoConSueldo + permisoSinSueldo + incapacidadCubreEmpresaDias + incapacidadCubreIHSSDias + inasistencias
   */
  conteoDias?: {
    totalPeriodo: number; // siempre 15
    diasLaborados: number; // 15 - (otras categorías)
    vacaciones: number; // E02 horas / 8
    permisoConSueldo: number; // E03 horas / 8
    permisoSinSueldo: number; // E04 horas / 8
    inasistencias: number; // E05 horas / 8
    incapacidadCubreEmpresaDias?: number; // E01 primeros 3 días consecutivos
    incapacidadCubreIHSSDias?: number; // E01 del día 4 en adelante
  };
  /**
   * Deducciones de alimentación calculadas
   */
  deduccionesAlimentacion?: number;
  /**
   * Detalle de las deducciones de alimentación
   */
  deduccionesAlimentacionDetalle?: DeduccionAlimentacionDetalleDto[];
  /**
   * Información sobre el error al obtener gastos de alimentación
   */
  errorAlimentacion?: {
    tieneError: boolean;
    mensajeError: string;
  };
  /**
   * Errores de validación encontrados durante el cálculo
   */
  validationErrors?: ConteoHorasValidationErrorDto;
  // Campos adicionales potenciales (según backend)
  totalHorasTrabajadas?: number;
  totalHorasLaborables?: number;
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

// =====================
// Prorrateo de horas DTOs (espejo del backend)
// =====================

export interface HorasPorJobDto {
  jobId: number;
  codigoJob: string;
  nombreJob: string;
  cantidadHoras: number;
  comentarios?: string[];
}

export interface ConteoHorasProrrateoDto {
  fechaInicio: string;
  fechaFin: string;
  empleadoId: string;
  cantidadHoras: {
    normal: HorasPorJobDto[];
    p25: HorasPorJobDto[];
    p50: HorasPorJobDto[];
    p75: HorasPorJobDto[];
    p100: HorasPorJobDto[];

    vacacionesHoras: number;
    permisoConSueldoHoras: number;
    permisoSinSueldoHoras: number;
    inasistenciasHoras: number;

    totalHorasLaborables: number;

    deduccionesISR: number;
    deduccionesRAP: number;
    deduccionesAlimentacion: number;
    deduccionesIHSS: number;
    Prestamo: number;
    Total: number;
  };
  validationErrors?: ConteoHorasValidationErrorDto;
}
