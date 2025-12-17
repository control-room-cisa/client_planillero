// src/services/calculoHorasTrabajoService.ts
import type { ApiResponse } from "../dtos/apiResponseDto";
import type {
  HorarioTrabajoDto,
  ConteoHorasTrabajadasDto,
  ConteoHorasProrrateoDto,
} from "../dtos/calculoHorasTrabajoDto";
import api from "./api";
import GastosAlimentacionService from "./gastosAlimentacionService";

// Interfaces para el desglose de incidencias
export interface DesgloseIncidencias {
  normal: { horas: number; porcentaje: string };
  overtime25: { horas: number; porcentaje: string };
  overtime50: { horas: number; porcentaje: string };
  overtime75: { horas: number; porcentaje: string };
  overtime100: { horas: number; porcentaje: string };
  totalHoras: number;
  horasNormales: number;
  diferencia: number;
}

export interface ResumenHorasTrabajo {
  empleadoId: string | number;
  fechaInicio: string;
  fechaFin: string;
  conteoHoras: ConteoHorasTrabajadasDto;
  desgloseIncidencias: DesgloseIncidencias;
}

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
          timeout: 20000, // 20 segundos (duplicado del timeout por defecto)
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener conteo de horas:", error);
      throw error;
    }
  }

  /**
   * Obtiene el prorrateo de horas por job en un período
   */
  static async getProrrateo(
    empleadoId: string | number,
    fechaInicio: string,
    fechaFin: string
  ): Promise<ConteoHorasProrrateoDto> {
    try {
      const response = await api.get<ApiResponse<ConteoHorasProrrateoDto>>(
        `/calculo-horas/${empleadoId}/prorrateo`,
        { params: { fechaInicio, fechaFin } }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error al obtener prorrateo:", error);
      throw error;
    }
  }

  /**
   * Obtiene las deducciones de alimentación de un empleado en un período
   * Llama directamente al endpoint externo desde el frontend
   * @param codigoEmpleado Código del empleado (no ID)
   * @param fechaInicio Fecha de inicio en formato YYYY-MM-DD
   * @param fechaFin Fecha de fin en formato YYYY-MM-DD
   */
  static async getDeduccionesAlimentacion(
    codigoEmpleado: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<{
    deduccionesAlimentacion: number;
    detalle: Array<{
      producto: string;
      precio: number;
      fecha: string;
    }>;
    errorAlimentacion?: { tieneError: boolean; mensajeError: string };
  }> {
    // Validar parámetros
    if (!codigoEmpleado || codigoEmpleado.trim() === "") {
      console.error("[getDeduccionesAlimentacion] codigoEmpleado vacío o inválido:", codigoEmpleado);
      return {
        deduccionesAlimentacion: 0,
        detalle: [],
        errorAlimentacion: {
          tieneError: true,
          mensajeError: "El código del empleado es requerido",
        },
      };
    }

    if (!this.validarFormatoFecha(fechaInicio)) {
      console.error("[getDeduccionesAlimentacion] fechaInicio formato inválido:", fechaInicio);
      return {
        deduccionesAlimentacion: 0,
        detalle: [],
        errorAlimentacion: {
          tieneError: true,
          mensajeError: `Formato de fechaInicio inválido: ${fechaInicio}. Se espera YYYY-MM-DD`,
        },
      };
    }

    if (!this.validarFormatoFecha(fechaFin)) {
      console.error("[getDeduccionesAlimentacion] fechaFin formato inválido:", fechaFin);
      return {
        deduccionesAlimentacion: 0,
        detalle: [],
        errorAlimentacion: {
          tieneError: true,
          mensajeError: `Formato de fechaFin inválido: ${fechaFin}. Se espera YYYY-MM-DD`,
        },
      };
    }

    if (!this.validarRangoFechas(fechaInicio, fechaFin)) {
      console.error("[getDeduccionesAlimentacion] Rango de fechas inválido:", { fechaInicio, fechaFin });
      return {
        deduccionesAlimentacion: 0,
        detalle: [],
        errorAlimentacion: {
          tieneError: true,
          mensajeError: `La fecha de inicio (${fechaInicio}) debe ser menor o igual a la fecha de fin (${fechaFin})`,
        },
      };
    }

    console.log("[getDeduccionesAlimentacion] Parámetros validados:", {
      codigoEmpleado: codigoEmpleado.trim(),
      fechaInicio,
      fechaFin,
    });

    try {
      // Llamar directamente al endpoint externo desde el frontend
      const resultado = await GastosAlimentacionService.obtenerConsumo({
        codigoEmpleado: codigoEmpleado.trim(),
        fechaInicio,
        fechaFin,
      });

      if (!resultado.success) {
        return {
          deduccionesAlimentacion: 0,
          detalle: [],
          errorAlimentacion: {
            tieneError: true,
            mensajeError: resultado.message || "Error al obtener deducciones de alimentación",
          },
        };
      }

      // Calcular el total de deducciones
      const deduccionesAlimentacion = (resultado.items || []).reduce(
        (total, item) => total + item.precio,
        0
      );

      return {
        deduccionesAlimentacion,
        detalle: resultado.items || [],
        errorAlimentacion: undefined,
      };
    } catch (error: any) {
      console.error("Error al obtener deducciones de alimentación:", error);
      return {
        deduccionesAlimentacion: 0,
        detalle: [],
        errorAlimentacion: {
          tieneError: true,
          mensajeError: error?.message || "Error al obtener deducciones de alimentación",
        },
      };
    }
  }

  /**
   * Calcula el desglose de incidencias basado en las horas trabajadas vs normales
   * @param conteoHoras Objeto con el conteo de horas del backend
   * @returns Desglose de incidencias con horas y porcentajes
   */
  static calcularDesgloseIncidencias(
    conteoHoras: ConteoHorasTrabajadasDto
  ): DesgloseIncidencias {
    const horasNormales = conteoHoras.cantidadHoras.normal || 0;
    const horasP25 = conteoHoras.cantidadHoras.p25 || 0;
    const horasP50 = conteoHoras.cantidadHoras.p50 || 0;
    const horasP75 = conteoHoras.cantidadHoras.p75 || 0;
    const horasP100 = conteoHoras.cantidadHoras.p100 || 0;

    const totalHorasTrabajadas =
      horasNormales + horasP25 + horasP50 + horasP75 + horasP100;
    const totalHorasLaborables = conteoHoras.totalHorasLaborables || 0;

    // Si no hay horas trabajadas, retornar valores en cero
    if (totalHorasTrabajadas === 0) {
      return {
        normal: { horas: 0, porcentaje: "0%" },
        overtime25: { horas: 0, porcentaje: "0%" },
        overtime50: { horas: 0, porcentaje: "0%" },
        overtime75: { horas: 0, porcentaje: "0%" },
        overtime100: { horas: 0, porcentaje: "0%" },
        totalHoras: 0,
        horasNormales: totalHorasLaborables,
        diferencia: -totalHorasLaborables,
      };
    }

    return {
      normal: {
        horas: horasNormales,
        porcentaje: `${((horasNormales / totalHorasTrabajadas) * 100).toFixed(
          1
        )}%`,
      },
      overtime25: {
        horas: horasP25,
        porcentaje: `${((horasP25 / totalHorasTrabajadas) * 100).toFixed(1)}%`,
      },
      overtime50: {
        horas: horasP50,
        porcentaje: `${((horasP50 / totalHorasTrabajadas) * 100).toFixed(1)}%`,
      },
      overtime75: {
        horas: horasP75,
        porcentaje: `${((horasP75 / totalHorasTrabajadas) * 100).toFixed(1)}%`,
      },
      overtime100: {
        horas: horasP100,
        porcentaje: `${((horasP100 / totalHorasTrabajadas) * 100).toFixed(1)}%`,
      },
      totalHoras: totalHorasTrabajadas,
      horasNormales: totalHorasLaborables,
      diferencia: totalHorasTrabajadas - totalHorasLaborables,
    };
  }

  /**
   * Obtiene el resumen completo de horas de trabajo con desglose de incidencias
   * @param empleadoId ID del empleado
   * @param fechaInicio Fecha de inicio en formato YYYY-MM-DD
   * @param fechaFin Fecha de fin en formato YYYY-MM-DD
   * @returns Resumen completo con conteo y desglose
   */
  static async getResumenHorasTrabajo(
    empleadoId: string | number,
    fechaInicio: string,
    fechaFin: string
  ): Promise<ResumenHorasTrabajo> {
    try {
      // Obtener el conteo de horas
      const conteoHoras = await this.getConteoHoras(
        empleadoId,
        fechaInicio,
        fechaFin
      );

      // Calcular el desglose de incidencias
      const desgloseIncidencias = this.calcularDesgloseIncidencias(conteoHoras);

      return {
        empleadoId,
        fechaInicio,
        fechaFin,
        conteoHoras,
        desgloseIncidencias,
      };
    } catch (error) {
      console.error("Error al obtener resumen de horas de trabajo:", error);
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
