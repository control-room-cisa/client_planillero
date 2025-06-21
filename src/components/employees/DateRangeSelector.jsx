import React, { useEffect, useState } from "react";
import { Grid, Typography, Paper, Button, Box } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const SelectorRangoFechas = ({
  onConfirmarRango,
  fechaInicial = null,
  fechaFinal = null,
}) => {
  const [fechaInicio, setFechaInicio] = useState(fechaInicial);
  const [fechaFin, setFechaFin] = useState(fechaFinal);
  const [error, setError] = useState("");

  useEffect(() => {
    setFechaInicio(fechaInicial);
    setFechaFin(fechaFinal);
  }, [fechaInicial, fechaFinal]);

  const manejarConfirmacion = () => {
    if (!fechaInicio || !fechaFin) {
      setError("Debe seleccionar ambas fechas.");
      return;
    }

    if (dayjs(fechaInicio).isAfter(fechaFin)) {
      setError("La fecha de inicio no puede ser después de la fecha final.");
    } else {
      setError("");
      onConfirmarRango({
        inicio: dayjs(fechaInicio).format("YYYY-MM-DD"),
        fin: dayjs(fechaFin).format("YYYY-MM-DD"),
      });
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ padding: 3 }}>
        <Typography
          variant="h4"
          gutterBottom
          justifyContent="center"
          textAlign="center"
        >
          Bienvenido, para comenzar a llenar su planilla debe seleccionar una
          fecha inicial y una fecha final
        </Typography>

        <Grid
          container
          spacing={3}
          columns={12}
          justifyContent="space-evenly"
          marginTop={2}
        >
          <Grid sx={{ gridColumn: { xs: "span 12", sm: "span 6" } }}>
            <DatePicker
              label="Fecha de Inicio"
              format="DD/MM/YYYY"
              value={fechaInicio}
              onChange={setFechaInicio}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          <Grid sx={{ gridColumn: { xs: "span 12", sm: "span 6" } }}>
            <DatePicker
              label="Fecha de Fin"
              format="DD/MM/YYYY"
              value={fechaFin}
              onChange={setFechaFin}
              minDate={fechaInicio}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          {error && (
            <Grid sx={{ gridColumn: "span 12" }}>
              <Typography color="error" textAlign="center">
                {error}
              </Typography>
            </Grid>
          )}

          <Grid sx={{ gridColumn: { xs: "span 12", sm: "span 6" } }}>
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height="56px"
            >
              <Button
                sx={{
                  width: {
                    xs: 180,
                    sm: 180,
                    md: 190,
                    lg: 190,
                    xl: 190
                  },
                  height: 50,
                  fontSize: {
                    xs: 15,
                    sm: 15,
                    md: 15,
                    lg: 15,
                    xl: 15
                  }
                }}
                variant="contained"
                onClick={manejarConfirmacion}
              >
                Confirmar Rango
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </LocalizationProvider>
  );
};

export default SelectorRangoFechas;
