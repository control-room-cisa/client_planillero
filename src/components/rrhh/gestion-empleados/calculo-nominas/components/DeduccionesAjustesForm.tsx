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

  // Totales
  totalPercepciones: number;
  totalDeducciones: number;
  totalNetoPagar: number;

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
  totalPercepciones,
  totalDeducciones,
  totalNetoPagar,
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

    inputMontoExcedenteIHSS,
    setInputMontoExcedenteIHSS,
    setMontoExcedenteIHSS,

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
          {/* COLUMNA IZQUIERDA: 3 PERCEPCIONES + IHSS + RAP */}
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
          {/* COLUMNA DERECHA: DEDUCCIONES RESTANTES */}
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
            // En primera quincena ISR es editable (alimentación se mantiene).
          />
          <TextField
            label="(+) Monto Incapacidad (IHSS) - No suma a total"
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
            helperText="Este monto es informativo y NO se incluye en el total de percepciones"
          />
          <TextField
            label="(+) Monto Excedente IHSS"
            type="text"
            inputMode="decimal"
            size="small"
            placeholder="0"
            value={inputMontoExcedenteIHSS}
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setInputMontoExcedenteIHSS(sanitized);
              setMontoExcedenteIHSS(parseDecimalValue(sanitized));
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
            // En primera quincena Préstamo es editable (alimentación se mantiene).
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
              <strong>Total Percepciones:</strong>
            </Typography>
            <Typography variant="body1">
              {formatCurrency(totalPercepciones)}
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
              <strong>Total Neto a Pagar:</strong>
            </Typography>
            <Typography variant="body1">
              {formatCurrency(totalNetoPagar)}
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
