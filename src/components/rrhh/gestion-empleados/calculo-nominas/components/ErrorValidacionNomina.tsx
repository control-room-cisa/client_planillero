import * as React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";

interface ErrorValidacionNominaProps {
  error: any;
  onRetry: () => void;
}

/**
 * Alert con el detalle de error del endpoint de horas/nómina:
 *  - Errores de red / configuración.
 *  - `validationErrors` (fechas no aprobadas / sin registro / otros).
 *  - Fallback de error genérico.
 */
const ErrorValidacionNomina: React.FC<ErrorValidacionNominaProps> = ({
  error,
  onRetry,
}) => {
  if (!error) return null;

  const esErrorDeRed =
    (error as any)?.userMessage ||
    error?.message?.includes("fetch failed") ||
    error?.message?.includes("Network Error") ||
    error?.code === "ERR_NETWORK";

  return (
    <Alert severity="error" sx={{ mb: 3 }}>
      {esErrorDeRed ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            Error de conexión con el servidor
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {(error as any)?.userMessage ||
              error?.message ||
              "No se pudo conectar con el servidor. Verifica tu conexión a internet."}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontSize: "0.75rem" }}
          >
            <strong>Detalles técnicos:</strong> {error?.message || "N/A"}
            {error?.config?.baseURL && (
              <>
                <br />
                <strong>URL base:</strong> {error.config.baseURL}
              </>
            )}
            {error?.config?.url && (
              <>
                <br />
                <strong>Endpoint:</strong> {error.config.url}
              </>
            )}
          </Typography>
        </Box>
      ) : error.response?.data?.validationErrors ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            No se puede procesar la nómina
          </Typography>
          {error.response.data.validationErrors.fechasNoAprobadas?.length >
            0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                📋 Fechas no aprobadas por supervisor:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {error.response.data.validationErrors.fechasNoAprobadas.map(
                  (fecha: string) => (
                    <Typography
                      key={fecha}
                      variant="body2"
                      sx={{
                        backgroundColor: "error.light",
                        color: "error.contrastText",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: "0.875rem",
                      }}
                    >
                      {new Date(fecha + "T00:00:00").toLocaleDateString(
                        "es-HN",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        },
                      )}
                    </Typography>
                  ),
                )}
              </Box>
            </Box>
          )}
          {error.response.data.validationErrors.fechasSinRegistro?.length >
            0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                📝 Fechas sin registro diario:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {error.response.data.validationErrors.fechasSinRegistro.map(
                  (fecha: string) => (
                    <Typography
                      key={fecha}
                      variant="body2"
                      sx={{
                        backgroundColor: "warning.light",
                        color: "warning.contrastText",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: "0.875rem",
                      }}
                    >
                      {new Date(fecha + "T00:00:00").toLocaleDateString(
                        "es-HN",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        },
                      )}
                    </Typography>
                  ),
                )}
              </Box>
            </Box>
          )}
          {/* Otros errores de validación generales (empleadoId, etc.) */}
          {Object.entries(error.response.data.validationErrors)
            .filter(
              ([k]) =>
                !["fechasNoAprobadas", "fechasSinRegistro"].includes(
                  k as string,
                ),
            )
            .map(([campo, mensajes]: any) => (
              <Box key={campo} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="error">
                  {campo}
                </Typography>
                {Array.isArray(mensajes) && mensajes.length > 0 && (
                  <Box sx={{ pl: 2 }}>
                    {mensajes.map((m: string, i: number) => (
                      <Typography key={i} variant="body2" color="error">
                        • {m}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            💡 Contacte al supervisor para aprobar los registros pendientes o
            complete los registros faltantes.
          </Typography>
        </Box>
      ) : (
        // Regular error message
        error.response?.data?.message ||
        (error.response?.status === 404
          ? "No se pudo conectar con el servidor"
          : "Error al cargar los datos")
      )}
      <Button size="small" onClick={onRetry} sx={{ ml: 2 }}>
        Reintentar
      </Button>
    </Alert>
  );
};

export default ErrorValidacionNomina;
