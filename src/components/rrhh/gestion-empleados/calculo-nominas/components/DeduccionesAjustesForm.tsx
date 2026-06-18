import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  parseDecimalValue,
  sanitizeDecimalInput,
} from "../utils/formatters";
import type { UseDeduccionesNominaReturn } from "../hooks/useDeduccionesNomina";
import type { ErrorAlimentacion } from "../hooks/useAlimentacionPorCodigo";

interface DeduccionesAjustesFormProps {
  nombrePeriodoNomina: string;
  codigoNominaTerminaEnA: boolean;
  codigoNominaPeriodo: string;

  PISO_IHSS: number;
  formatCurrency: (valor: number) => string;

  // Estados y setters de deducciones/ajustes/comentario
  deducciones: UseDeduccionesNominaReturn;

  // Alimentación
  inputDeduccionAlimentacion: string;
  setInputDeduccionAlimentacion: React.Dispatch<React.SetStateAction<string>>;
  setDeduccionAlimentacion: React.Dispatch<React.SetStateAction<number>>;
  errorAlimentacion: ErrorAlimentacion | null;
  loadingAlimentacion: boolean;
  onOpenDetalleAlimentacion: () => void;

  // Totales (alineados con prorrateo)
  totalBruto: number;
  totalDeducciones: number;
  totalAPagar: number;

  // Botón de generación de nómina
  fechaInicio: string;
  fechaFin: string;
  nominaExiste: boolean;
  crearNominaDisabled: boolean;
  loadingNominaCheck: boolean;
  onGenerarNomina: () => void;
}

/**
 * Bloque "Ajuste y Deducciones":
 *  - Inputs de percepciones y deducciones (incluyendo Alimentación con detalle).
 *  - Totales (percepciones / deducciones / neto).
 *  - Comentario.
 *  - Botón "Generar Nómina".
 */
const DeduccionesAjustesForm: React.FC<DeduccionesAjustesFormProps> = ({
  nombrePeriodoNomina,
  codigoNominaTerminaEnA,
  codigoNominaPeriodo,
  PISO_IHSS,
  formatCurrency,
  deducciones,
  inputDeduccionAlimentacion,
  setInputDeduccionAlimentacion,
  setDeduccionAlimentacion,
  errorAlimentacion,
  loadingAlimentacion,
  onOpenDetalleAlimentacion,
  totalBruto,
  totalDeducciones,
  totalAPagar,
  fechaInicio,
  fechaFin,
  nominaExiste,
  crearNominaDisabled,
  loadingNominaCheck,
  onGenerarNomina,
}) => {
  const {
    inputMontoIncapacidadEmpresa,
    setInputMontoIncapacidadEmpresa,
    setMontoIncapacidadCubreEmpresa,

    inputDeduccionISR,
    setInputDeduccionISR,
    setDeduccionISR,

    inputMontoIncapacidadIHSS,
    setInputMontoIncapacidadIHSS,
    setMontoIncapacidadIHSS,

    inputAjuste,
    setInputAjuste,
    setAjuste,

    inputCobroPrestamo,
    setInputCobroPrestamo,
    setCobroPrestamo,

    inputDeduccionIHSS,
    setInputDeduccionIHSS,
    setDeduccionIHSS,

    inputImpuestoVecinal,
    setInputImpuestoVecinal,
    setImpuestoVecinal,

    inputDeduccionRAP,
    setInputDeduccionRAP,
    setDeduccionRAP,

    inputOtros,
    setInputOtros,
    setOtros,

    inputDeduccionAlojamiento,
    setInputDeduccionAlojamiento,
    setDeduccionAlojamiento,

    comentario,
    setComentario,
  } = deducciones;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Ajuste y Deducciones
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        {nombrePeriodoNomina && (
          <Typography
            variant="h6"
            color="primary"
            sx={{ mb: 2, fontWeight: 700 }}
          >
            {nombrePeriodoNomina}
          </Typography>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 2,
          }}
        >
          <TextField
            label="(+) Monto Incapacidad (Empresa)"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputMontoIncapacidadEmpresa}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputMontoIncapacidadEmpresa(sanitized);
              setMontoIncapacidadCubreEmpresa(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label="Monto Incapacidad (IHSS)"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputMontoIncapacidadIHSS}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputMontoIncapacidadIHSS(sanitized);
              setMontoIncapacidadIHSS(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label="(-) Deducción Alimentación"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputDeduccionAlimentacion}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputDeduccionAlimentacion(sanitized);
              setDeduccionAlimentacion(parseDecimalValue(sanitized));
            }}
            InputProps={{
              readOnly: errorAlimentacion?.tieneError !== true,
              endAdornment:
                !loadingAlimentacion &&
                errorAlimentacion?.tieneError !== true ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Ver detalle de deducción de alimentación"
                      onClick={onOpenDetalleAlimentacion}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
            }}
            disabled={loadingAlimentacion}
            helperText={
              loadingAlimentacion
                ? "Cargando datos..."
                : errorAlimentacion?.tieneError
                  ? errorAlimentacion.mensajeError
                  : undefined
            }
            error={errorAlimentacion?.tieneError === true}
          />
          <TextField
            label="(-) Deducción Alojamiento"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputDeduccionAlojamiento}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputDeduccionAlojamiento(sanitized);
              setDeduccionAlojamiento(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label={`(-) Deducción RAP (1.5% excedente sobre ${formatCurrency(
              PISO_IHSS,
            )})`}
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputDeduccionRAP}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputDeduccionRAP(sanitized);
              setDeduccionRAP(parseDecimalValue(sanitized));
            }}
            disabled={codigoNominaTerminaEnA}
            helperText={
              codigoNominaTerminaEnA
                ? "Primera quincena: sin deducciones"
                : undefined
            }
          />
          <TextField
            label="(-) Deducción ISR"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputDeduccionISR}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputDeduccionISR(sanitized);
              setDeduccionISR(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label="(+) Ajuste"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputAjuste}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputAjuste(sanitized);
              setAjuste(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label="(-) Otros"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputOtros}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputOtros(sanitized);
              setOtros(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label="(-) Deducción IHSS"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputDeduccionIHSS}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputDeduccionIHSS(sanitized);
              setDeduccionIHSS(parseDecimalValue(sanitized));
            }}
            disabled={codigoNominaTerminaEnA}
            helperText={
              codigoNominaTerminaEnA
                ? "Primera quincena: sin deducciones"
                : undefined
            }
          />
          <TextField
            label="(-) Cobro Préstamo"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputCobroPrestamo}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputCobroPrestamo(sanitized);
              setCobroPrestamo(parseDecimalValue(sanitized));
            }}
          />
          <TextField
            label="(-) Impuesto Vecinal"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputImpuestoVecinal}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputImpuestoVecinal(sanitized);
              setImpuestoVecinal(parseDecimalValue(sanitized));
            }}
            disabled={codigoNominaTerminaEnA}
            helperText={
              codigoNominaTerminaEnA
                ? "Primera quincena: sin deducciones"
                : undefined
            }
          />
          <TextField
            label="Código de nómina"
            size="small"
            value={codigoNominaPeriodo}
            disabled
            helperText="Generado automáticamente según el período seleccionado"
            sx={{ gridColumn: { xs: "1", md: "2" } }}
          />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1">
              <strong>Total Bruto:</strong>
            </Typography>
            <Typography variant="body1">
              {formatCurrency(totalBruto)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1">
              <strong>Total Deducciones:</strong>
            </Typography>
            <Typography variant="body1">
              {formatCurrency(totalDeducciones)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1">
              <strong>Total a Pagar:</strong>
            </Typography>
            <Typography variant="body1">
              {formatCurrency(totalAPagar)}
            </Typography>
          </Box>
        </Box>

        {/* Campo de comentario */}
        <Box sx={{ mt: 3 }}>
          <TextField
            label="Comentario"
            multiline
            rows={3}
            fullWidth
            placeholder="Agregar comentario adicional (máximo 200 caracteres)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value.substring(0, 200))}
            inputProps={{ maxLength: 200 }}
            helperText={`${comentario.length}/200 caracteres`}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          {nominaExiste && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Nómina generada para el período seleccionado ({fechaInicio} -{" "}
              {fechaFin}). No se puede generar otra nómina para el mismo
              intervalo.
            </Alert>
          )}
          <Box sx={{ textAlign: "right" }}>
            <Button
              variant="contained"
              color="primary"
              disabled={crearNominaDisabled || loadingNominaCheck}
              onClick={onGenerarNomina}
            >
              {loadingNominaCheck ? "Verificando..." : "Generar Nómina"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default DeduccionesAjustesForm;
