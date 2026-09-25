import * as React from "react";
import ErrorValidacionPeriodo from "../../../../common/ErrorValidacionPeriodo";

interface ErrorValidacionNominaProps {
  error: any;
  onRetry: () => void;
}

/**
 * Wrapper de nómina sobre el alert compartido de validación de período.
 */
const ErrorValidacionNomina: React.FC<ErrorValidacionNominaProps> = ({
  error,
  onRetry,
}) => (
  <ErrorValidacionPeriodo
    error={error}
    onRetry={onRetry}
    title="No se puede procesar la nómina"
  />
);

export default ErrorValidacionNomina;
