import * as React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import {
  formatFechaValidacion,
  getValidationErrorsFromError,
  hasPendingValidations,
  otherValidationEntries,
  type ValidationErrorsMap,
} from "../../utils/validationErrors";

export type { ValidationErrorsMap };
export {
  buildValidationErrorsMessage,
  hasPendingValidations,
} from "../../utils/validationErrors";

export type ErrorValidacionPeriodoProps = {
  /** Error de axios/fetch (carga de datos). */
  error?: unknown;
  /** Validaciones directas (p. ej. soft warnings o fallo al guardar). */
  validationErrors?: ValidationErrorsMap | null;
  title?: string;
  severity?: "error" | "warning";
  onRetry?: () => void;
  onClose?: () => void;
  sx?: object;
};

const FechaChips: React.FC<{
  fechas: string[];
  tone: "error" | "warning";
}> = ({ fechas, tone }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
    {fechas.map((fecha) => (
      <Typography
        key={fecha}
        variant="body2"
        sx={{
          backgroundColor: tone === "error" ? "error.light" : "warning.light",
          color:
            tone === "error" ? "error.contrastText" : "warning.contrastText",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: "0.875rem",
        }}
      >
        {formatFechaValidacion(fecha)}
      </Typography>
    ))}
  </Box>
);

/**
 * Alert compartido para errores de período (nómina / prorrateo / horas):
 * red, validationErrors con chips de fechas, o mensaje genérico.
 */
const ErrorValidacionPeriodo: React.FC<ErrorValidacionPeriodoProps> = ({
  error,
  validationErrors: validationErrorsProp,
  title = "No se puede procesar el período",
  severity: severityProp,
  onRetry,
  onClose,
  sx,
}) => {
  const validationFromError = getValidationErrorsFromError(error);
  const validationErrors =
    (hasPendingValidations(validationErrorsProp)
      ? validationErrorsProp
      : null) ?? validationFromError;

  const err = error as any;
  const esErrorDeRed =
    !!err &&
    (err?.userMessage ||
      err?.message?.includes("fetch failed") ||
      err?.message?.includes("Network Error") ||
      err?.code === "ERR_NETWORK");

  if (!error && !hasPendingValidations(validationErrors)) {
    return null;
  }

  const fechasNoAprobadas = validationErrors?.fechasNoAprobadas ?? [];
  const fechasSinRegistro = validationErrors?.fechasSinRegistro ?? [];
  const fechasConJobDesconocido =
    validationErrors?.fechasConJobDesconocido ?? [];
  const erroresIncapacidad = validationErrors?.erroresIncapacidad ?? [];
  const otros = otherValidationEntries(validationErrors);

  const severity =
    severityProp ??
    (hasPendingValidations(validationErrors) && !error ? "warning" : "error");

  return (
    <Alert
      severity={severity}
      onClose={onClose}
      sx={{ mb: 3, width: "100%", ...sx }}
    >
      {esErrorDeRed ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            Error de conexión con el servidor
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {err?.userMessage ||
              err?.message ||
              "No se pudo conectar con el servidor. Verifica tu conexión a internet."}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontSize: "0.75rem" }}
          >
            <strong>Detalles técnicos:</strong> {err?.message || "N/A"}
            {err?.config?.baseURL && (
              <>
                <br />
                <strong>URL base:</strong> {err.config.baseURL}
              </>
            )}
            {err?.config?.url && (
              <>
                <br />
                <strong>Endpoint:</strong> {err.config.url}
              </>
            )}
          </Typography>
        </Box>
      ) : hasPendingValidations(validationErrors) ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          {fechasNoAprobadas.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                Fechas no aprobadas por supervisor:
              </Typography>
              <FechaChips fechas={fechasNoAprobadas} tone="error" />
            </Box>
          )}
          {fechasSinRegistro.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                Fechas sin registro diario:
              </Typography>
              <FechaChips fechas={fechasSinRegistro} tone="warning" />
            </Box>
          )}
          {fechasConJobDesconocido.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                Fechas con Job desconocido:
              </Typography>
              <FechaChips fechas={fechasConJobDesconocido} tone="warning" />
            </Box>
          )}
          {erroresIncapacidad.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                Incapacidad IHSS — Techo IHSS faltante:
              </Typography>
              <Box sx={{ pl: 1 }}>
                {erroresIncapacidad.map((msg, i) => (
                  <Typography key={i} variant="body2" color="error">
                    • {msg}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
          {otros.map(([campo, mensajes]) => (
            <Box key={campo} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="error">
                {campo}
              </Typography>
              <Box sx={{ pl: 2 }}>
                {mensajes.map((m, i) => (
                  <Typography key={i} variant="body2" color="error">
                    • {m}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
          {fechasNoAprobadas.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Contacte al supervisor para aprobar los registros pendientes.
            </Typography>
          )}
          {fechasSinRegistro.length > 0 && fechasNoAprobadas.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Complete los registros diarios faltantes en el período.
            </Typography>
          )}
          {fechasConJobDesconocido.length > 0 &&
            fechasNoAprobadas.length === 0 &&
            fechasSinRegistro.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Corrija las actividades con Job desconocido antes de continuar.
              </Typography>
            )}
          {erroresIncapacidad.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Agregue el Techo IHSS faltante en Parámetros de nómina → pestaña
              Techo IHSS.
            </Typography>
          )}
        </Box>
      ) : (
        err?.response?.data?.message ||
        err?.message ||
        (err?.response?.status === 404
          ? "No se pudo conectar con el servidor"
          : "Error al cargar los datos")
      )}
      {onRetry && (
        <Button size="small" onClick={onRetry} sx={{ ml: 2, mt: 1 }}>
          Reintentar
        </Button>
      )}
    </Alert>
  );
};

export default ErrorValidacionPeriodo;
