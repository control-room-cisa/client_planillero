// src/services/calculoHorasTrabajoService.ts
import type { ApiResponse } from "../dtos/apiResponseDto";
import type {
  HorarioTrabajoDto,
  ConteoHorasTrabajadasDto,
} from "../dtos/calculoHorasTrabajoDto";
import api from "./api";

class CalculoHorasTrabajoService {
  /**
   * Obtiene el horario de trabajo de un empleado para una fecha específica
   * @param empleadoId ID del empleado
   * @param fecha Fecha en formato YYYY-MM-DD
   */
  static async getHorarioTrabajo(
    empleadoId: string | number,
    fecha: string
  ): Promise<HorarioTrabajoDto> {
    try {
      const response = await api.get<ApiResponse<HorarioTrabajoDto>>(
        `/calculo-horas/${empleadoId}/horario/${fecha}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener horario de trabajo:", error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de horas trabajadas por un empleado en un período
   * @param empleadoId ID del empleado
   * @param fechaInicio Fecha de inicio en formato YYYY-MM-DD
   * @param fechaFin Fecha de fin en formato YYYY-MM-DD
   */
  static async getConteoHoras(
    empleadoId: string | number,
    fechaInicio: string,
    fechaFin: string
  ): Promise<ConteoHorasTrabajadasDto> {
    try {
      const response = await api.get<ApiResponse<ConteoHorasTrabajadasDto>>(
        `/calculo-horas/${empleadoId}/conteo-horas`,
        {
          params: {
            fechaInicio,
            fechaFin,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener conteo de horas:", error);
      throw error;
    }
  }

  /**
   * Obtiene las horas normales a trabajar para un empleado en una fecha específica
   * @param empleadoId ID del empleado
   * @param fecha Fecha en formato YYYY-MM-DD
   * @returns Objeto con información del horario y horas laborables
   */
  static async getHorasNormalesTrabajo(
    empleadoId: string | number,
    fecha: string
  ): Promise<{
    horarioTrabajo: HorarioTrabajoDto;
    horasNormales: number;
    esDiaLibre: boolean;
    esFestivo: boolean;
    nombreDiaFestivo: string;
  }> {
    try {
      const horario = await this.getHorarioTrabajo(empleadoId, fecha);
      
      return {
        horarioTrabajo: horario,
        horasNormales: horario.cantidadHorasLaborables,
        esDiaLibre: horario.esDiaLibre,
        esFestivo: horario.esFestivo,
        nombreDiaFestivo: horario.nombreDiaFestivo,
      };
    } catch (error) {
      console.error("Error al obtener horas normales de trabajo:", error);
      throw error;
    }
  }

  /**
   * Valida el formato de fecha YYYY-MM-DD
   */
  private static validarFormatoFecha(fecha: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(fecha);
  }

  /**
   * Valida que fechaInicio sea menor o igual a fechaFin
   */
  private static validarRangoFechas(
    fechaInicio: string,
    fechaFin: string
  ): boolean {
    return new Date(fechaInicio) <= new Date(fechaFin);
  }

  /**
   * Obtiene el conteo de horas con validaciones incluidas
   * @throws Error si las fechas no tienen el formato correcto o el rango es inválido
   */
  static async getConteoHorasValidado(
    empleadoId: string | number,
    fechaInicio: string,
    fechaFin: string
  ): Promise<ConteoHorasTrabajadasDto> {
    // Validar formato de fechas
    if (
      !this.validarFormatoFecha(fechaInicio) ||
      !this.validarFormatoFecha(fechaFin)
    ) {
      throw new Error("Formato de fecha inválido. Use YYYY-MM-DD");
    }

    // Validar rango de fechas
    if (!this.validarRangoFechas(fechaInicio, fechaFin)) {
      throw new Error(
        "La fecha de inicio debe ser menor o igual a la fecha de fin"
      );
    }

    return this.getConteoHoras(empleadoId, fechaInicio, fechaFin);
  }

  /**
   * Obtiene el horario de trabajo con validaciones incluidas
   * @throws Error si la fecha no tiene el formato correcto
   */
  static async getHorarioTrabajoValidado(
    empleadoId: string | number,
    fecha: string
  ): Promise<HorarioTrabajoDto> {
    // Validar formato de fecha
    if (!this.validarFormatoFecha(fecha)) {
      throw new Error("Formato de fecha inválido. Use YYYY-MM-DD");
    }

    return this.getHorarioTrabajo(empleadoId, fecha);
  }
}

export default CalculoHorasTrabajoService;
