import * as React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import type { DayConfigData, FormErrors, HorarioValidado } from "./types";

type JornadaConfigProps = {
  value: DayConfigData;
  errors?: FormErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  horarioValidado?: HorarioValidado | null;
};

/**
 * Componente de presentación para configurar la jornada del día.
 * No conoce de servicios ni side-effects; recibe estado y handlers por props.
 */
export default function JornadaConfig({
  value,
  errors = {},
  onChange,
  readOnly = false,
  horarioValidado,
}: JornadaConfigProps) {
  return (
    <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
      <CardContent>
        <Typography
          variant="h6"
          component="h2"
          sx={{ mb: 2, fontWeight: "bold" }}
        >
          Configuración del Día Laboral
        </Typography>

        {/* Chips informativos opcionales */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {horarioValidado?.mostrarJornada && (
            <Chip
              label={`Jornada: ${
                value.jornada === "D"
                  ? "Día"
                  : value.jornada === "N"
                  ? "Noche"
                  : "Mixta"
              }`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {horarioValidado?.mostrarNombreFestivo &&
            horarioValidado.nombreDiaFestivo && (
              <Chip
                label={`🎉 ${horarioValidado.nombreDiaFestivo}`}
                size="small"
                color="success"
                variant="filled"
              />
            )}
          {value.esDiaLibre && (
            <Chip
              label="Día Libre"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {value.esHoraCorrida && (
            <Chip
              label="Hora Corrida"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

        {/* Horas de Entrada / Salida */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mb: 3,
          }}
        >
          <TextField
            disabled={readOnly}
            fullWidth
            required
            type="time"
            name="horaEntrada"
            label="Hora de Entrada"
            value={value.horaEntrada}
            onChange={onChange}
            error={!!errors.horaEntrada}
            helperText={errors.horaEntrada}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <TextField
            disabled={readOnly}
            fullWidth
            required
            type="time"
            name="horaSalida"
            label="Hora de Salida"
            value={value.horaSalida}
            onChange={onChange}
            error={!!errors.horaSalida}
            helperText={errors.horaSalida}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Box>

        {/* Jornada / Flags */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mb: 3,
            alignItems: "center",
          }}
        >
          {horarioValidado?.mostrarJornada && (
            <FormControl fullWidth size="small">
              <InputLabel>Jornada</InputLabel>
              <Select
                disabled={readOnly}
                name="jornada"
                value={value.jornada}
                label="Jornada"
                onChange={(e) =>
                  onChange(
                    // Cast porque SelectChangeEvent no es un input event, pero el handler externo lo acepta como tal
                    e as unknown as React.ChangeEvent<HTMLInputElement>
                  )
                }
              >
                <MenuItem value="D">Día</MenuItem>
                <MenuItem value="N">Noche</MenuItem>
                <MenuItem value="M">Mixta</MenuItem>
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: "flex", alignItems: "center", minHeight: 40 }}>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={readOnly}
                  name="esDiaLibre"
                  checked={value.esDiaLibre}
                  onChange={onChange}
                  color="primary"
                />
              }
              label="Día Libre"
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", minHeight: 40 }}>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={readOnly}
                  name="esHoraCorrida"
                  checked={value.esHoraCorrida}
                  onChange={onChange}
                  color="primary"
                />
              }
              label="Hora Corrida"
            />
          </Box>
        </Box>

        {/* Comentario */}
        <TextField
          disabled={readOnly}
          fullWidth
          multiline
          rows={2}
          name="comentarioEmpleado"
          label="Comentario (opcional)"
          placeholder="Agregar comentarios adicionales..."
          value={value.comentarioEmpleado}
          onChange={onChange}
          size="small"
        />
      </CardContent>
    </Card>
  );
}
