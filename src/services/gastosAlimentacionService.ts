// src/services/gastosAlimentacionService.ts

const DEFAULT_GASTOS_ALIMENTACION_ENDPOINT =
  import.meta.env.VITE_GASTOS_ALIMENTACION_ENDPOINT ||
  "http://192.168.1.13:5200/api/employee/reportes/consumo";

export interface GastosAlimentacionParams {
  codigoEmpleado: string;
  fechaInicio: string; // formato YYYY-MM-DD
  fechaFin: string; // formato YYYY-MM-DD
}

interface GastosAlimentacionApiItem {
  Producto: string;
  Precio: string;
  Fecha: string;
}

interface GastosAlimentacionApiResponse {
  success: boolean;
  empleadoID?: number;
  codigoEmpleado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  items?: GastosAlimentacionApiItem[];
  message?: string; // Mensaje de error cuando success=false
}

export interface GastosAlimentacionItem {
  producto: string;
  precio: number;
  fecha: string;
}

export interface GastosAlimentacionResponse {
  success: boolean;
  empleadoID?: number;
  codigoEmpleado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  items?: GastosAlimentacionItem[];
  message?: string; // Mensaje de error cuando success=false
}

class GastosAlimentacionService {
  /**
   * Consulta el consumo de alimentación de un colaborador en un rango de fechas.
   * Llama directamente al endpoint externo desde el frontend.
   */
  static async obtenerConsumo(
    params: GastosAlimentacionParams
  ): Promise<GastosAlimentacionResponse> {
    const url = new URL(DEFAULT_GASTOS_ALIMENTACION_ENDPOINT);
    url.searchParams.set("codigo", params.codigoEmpleado);
    url.searchParams.set("inicio", params.fechaInicio);
    url.searchParams.set("fin", params.fechaFin);

    // Log para verificar parámetros enviados
    console.log("[GastosAlimentacionService] Parámetros enviados:", {
      codigo: params.codigoEmpleado,
      inicio: params.fechaInicio,
      fin: params.fechaFin,
      url: url.toString(),
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

      const t0 = Date.now();
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const tiempoTranscurrido = Date.now() - t0;
      console.log(`[GastosAlimentacionService] Respuesta recibida en ${tiempoTranscurrido}ms`);

      if (!response.ok) {
        // Intentar leer el cuerpo de la respuesta para más información
        let errorMessage = `Error al consultar gastos de alimentación: ${response.status} ${response.statusText}`;

        try {
          const errorBody = await response.text();

          // Intentar parsear el JSON del cuerpo de error
          try {
            const errorData = JSON.parse(errorBody) as {
              success?: boolean;
              message?: string;
            };

            // Si el servidor devuelve un mensaje en el JSON, usarlo
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            // No se pudo parsear el JSON, usar mensaje genérico
          }
        } catch (e) {
          // No se pudo leer el cuerpo de la respuesta
        }

        // En lugar de lanzar error, devolver respuesta con success=false
        return {
          success: false,
          message: errorMessage,
        };
      }

      const data = (await response.json()) as GastosAlimentacionApiResponse;

      // Devolver la respuesta completa, incluso si success=false
      // Esto permite que el llamador maneje el error según sea necesario
      return {
        success: data.success,
        empleadoID: data.empleadoID,
        codigoEmpleado: data.codigoEmpleado,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        items: (data.items ?? []).map((item) => ({
          producto: item.Producto,
          precio: Number(item.Precio ?? 0),
          fecha: item.Fecha,
        })),
        message: data.message,
      };
    } catch (error: any) {
      // Capturar errores de red u otros errores y devolver respuesta con success=false
      if (error.name === "AbortError") {
        console.error("[GastosAlimentacionService] Timeout después de 30 segundos");
        return {
          success: false,
          message: "La solicitud tardó demasiado tiempo (timeout de 30 segundos)",
        };
      }
      console.error("[GastosAlimentacionService] Error:", error);
      return {
        success: false,
        message:
          error?.message ||
          "Error al consultar gastos de alimentación: Error de conexión",
      };
    }
  }
}

export default GastosAlimentacionService;

