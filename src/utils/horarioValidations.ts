// src/utils/horarioValidations.ts
import type { HorarioTrabajoDto } from "../dtos/calculoHorasTrabajoDto";

export interface HorarioValidationResult {
  horaInicio: string;
  horaFin: string;
  esDiaLibre: boolean;
  esFestivo: boolean;
  nombreDiaFestivo: string;
  horasNormales: number;
  mostrarJornada: boolean;
  mostrarNombreFestivo: boolean;
}

/**
 * Valida y configura el horario según el tipo de horario del empleado
 */
export class HorarioValidator {
  /**
   * Valida horario para tipo H1 (Horario estándar de oficina)
   */
  static validateH1(
    horario: HorarioTrabajoDto,
    datosExistentes: boolean
  ): HorarioValidationResult {
    // Si hay datos existentes de la API, no modificar nada
    if (datosExistentes) {
      return {
        horaInicio: horario.horarioTrabajo.inicio,
        horaFin: horario.horarioTrabajo.fin,
        esDiaLibre: horario.esDiaLibre,
        esFestivo: horario.esFestivo,
        nombreDiaFestivo: horario.nombreDiaFestivo,
        horasNormales: horario.cantidadHorasLaborables,
        mostrarJornada: true,
        mostrarNombreFestivo: horario.esFestivo,
      };
    }

    // Si no hay datos existentes, establecer valores por defecto para H1
    const esDiaLibre = horario.esDiaLibre || horario.esFestivo;

    return {
      horaInicio: horario.horarioTrabajo.inicio,
      horaFin: horario.horarioTrabajo.fin,
      esDiaLibre,
      esFestivo: horario.esFestivo,
      nombreDiaFestivo: horario.nombreDiaFestivo,
      horasNormales: horario.cantidadHorasLaborables,
      mostrarJornada: true,
      mostrarNombreFestivo: horario.esFestivo,
    };
  }

  /**
   * Valida horario para tipo H2 (Horario de turnos rotativos)
   */
  static validateH2(
    horario: HorarioTrabajoDto,
    datosExistentes: boolean
  ): HorarioValidationResult {
    // Si hay datos existentes de la API, no modificar nada
    if (datosExistentes) {
      return {
        horaInicio: horario.horarioTrabajo.inicio,
        horaFin: horario.horarioTrabajo.fin,
        esDiaLibre: horario.esDiaLibre,
        esFestivo: horario.esFestivo,
        nombreDiaFestivo: horario.nombreDiaFestivo,
        horasNormales: horario.cantidadHorasLaborables,
        mostrarJornada: true,
        mostrarNombreFestivo: horario.esFestivo,
      };
    }

    // Si no hay datos existentes, establecer valores por defecto para H2
    const esDiaLibre = horario.esDiaLibre || horario.esFestivo;

    return {
      horaInicio: horario.horarioTrabajo.inicio,
      horaFin: horario.horarioTrabajo.fin,
      esDiaLibre,
      esFestivo: horario.esFestivo,
      nombreDiaFestivo: horario.nombreDiaFestivo,
      horasNormales: horario.cantidadHorasLaborables,
      mostrarJornada: true,
      mostrarNombreFestivo: horario.esFestivo,
    };
  }

  /**
   * Valida horario para tipo H3 (Horario extendido)
   */
  static validateH3(
    horario: HorarioTrabajoDto,
    datosExistentes: boolean
  ): HorarioValidationResult {
    // Si hay datos existentes de la API, no modificar nada
    if (datosExistentes) {
      return {
        horaInicio: horario.horarioTrabajo.inicio,
        horaFin: horario.horarioTrabajo.fin,
        esDiaLibre: horario.esDiaLibre,
        esFestivo: horario.esFestivo,
        nombreDiaFestivo: horario.nombreDiaFestivo,
        horasNormales: horario.cantidadHorasLaborables,
        mostrarJornada: true,
        mostrarNombreFestivo: horario.esFestivo,
      };
    }

    // Si no hay datos existentes, establecer valores por defecto para H3
    const esDiaLibre = horario.esDiaLibre || horario.esFestivo;

    return {
      horaInicio: horario.horarioTrabajo.inicio,
      horaFin: horario.horarioTrabajo.fin,
      esDiaLibre,
      esFestivo: horario.esFestivo,
      nombreDiaFestivo: horario.nombreDiaFestivo,
      horasNormales: horario.cantidadHorasLaborables,
      mostrarJornada: true,
      mostrarNombreFestivo: horario.esFestivo,
    };
  }

  /**
   * Valida horario según el tipo específico
   */
  static validateByTipo(
    tipoHorario: string,
    horario: HorarioTrabajoDto,
    datosExistentes: boolean
  ): HorarioValidationResult {
    switch (tipoHorario) {
      case "H1":
      case "H1_1":
      case "H1_2":
        return this.validateH1(horario, datosExistentes);
      case "H2":
        return this.validateH2(horario, datosExistentes);
      case "H3":
        return this.validateH3(horario, datosExistentes);
      default:
        // Para tipos no implementados, usar H1 como fallback
        return this.validateH1(horario, datosExistentes);
    }
  }

  /**
   * Obtiene el mensaje de horas faltantes
   */
  static getHorasFaltantesMessage(
    horasTrabajadas: number,
    horasNormales: number
  ): string {
    const faltantes = Math.max(0, horasNormales - horasTrabajadas);
    return `Faltan ${faltantes.toFixed(1)} horas para completar el día`;
  }

  /**
   * Obtiene el porcentaje de progreso
   */
  static getProgressPercentage(
    horasTrabajadas: number,
    horasNormales: number
  ): number {
    if (horasNormales <= 0) return 0;
    return Math.min(100, Math.max(0, (horasTrabajadas / horasNormales) * 100));
  }
}
