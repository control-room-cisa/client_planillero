import React, { useState } from "react";
import {
  Stack,
  Box,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";

const PayrollForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Estados para los campos editables
  const [nominaPeriod, setNominaPeriod] = useState("");
  const [payrollDate, setPayrollDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [employee, setEmployee] = useState("");
  const { empresa } = useParams();

  // Datos de ejemplo
  const periodOptions = [
    { value: "semanal", label: "Semanal" },
    { value: "quincenal", label: "Quincenal" },
    { value: "mensual", label: "Mensual" },
  ];

  const employeeOptions = [
    { value: "1", label: "Juan Pérez" },
    { value: "2", label: "María García" },
    { value: "3", label: "Carlos Rodríguez" },
  ];


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
        }}
      >
        {/* Encabezado */}
        <Typography
          variant="h5"
          align="center"
          sx={{
            fontWeight: "bold",
            mb: 4,
            color: "gray",
          }}
        >
          Empresa {empresa.toUpperCase()}
        </Typography>

        <Typography
          sx={{
            fontWeight: "bold",
            backgroundColor: "#d7d7d7",
            marginTop: 2,
            marginBottom: 2,
            display: "flex",
            justifyContent: "center",
          }}
        >
          Generalidades de nomina
        </Typography>

        <Stack spacing={3}>
          {/* Fila 1: Período y Fecha de nómina */}
          <Stack direction={isMobile ? "column" : "row"} spacing={3}>
            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography fontSize={15} variant="body2" color="blak">
                Período de nómina
              </Typography>
              <TextField
                select
                value={nominaPeriod}
                onChange={(e) => setNominaPeriod(e.target.value)}
                fullWidth
              >
                {periodOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography fontSize={15} variant="body2" color="blak">
                Fecha de nómina
              </Typography>
              <DatePicker
                format="DD/MM/YYYY"
                value={payrollDate}
                onChange={(newValue) => setPayrollDate(newValue)}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" />
                )}
              />
            </Stack>
          </Stack>

          {/* Fila 2: Empleado */}
          <Stack spacing={1}>
            <Typography fontSize={15} variant="body2" color="blak">
              Seleccione empleado
            </Typography>
            <TextField
              select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              fullWidth
            >
              {employeeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Fila 3: Fecha de corte */}
          <Stack spacing={1}>
            <Typography fontSize={15} variant="body2" color="blak">
              Seleccione fechas de corte
            </Typography>
            <Stack direction={isMobile ? "column" : "row"} spacing={5}>
              <DatePicker
                label="Fecha inicial"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                format="DD/MM/YYYY"
                sx={{ width: 530 }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: "DD/MM/AAAA",
                  },
                }}
              />

              <DatePicker
                label="Fecha final"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                format="DD/MM/YYYY"
                sx={{ width: 530 }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: "DD/MM/AAAA",
                  },
                }}
              />
            </Stack>
          </Stack>

          <Divider />

          {/* Campos de solo lectura */}
          <Grid container spacing={5}>
            {/* Columna izquierda */}
            <Grid item xs={12} sm={6}>
              <Typography
                sx={{
                  fontWeight: "bold",
                  backgroundColor: "#d7d7d7",
                  marginTop: 2,
                  marginBottom: 3,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                Desglose de dias
              </Typography>

              <Stack spacing={2}>
                {[
                  { label: "Días laborados", value: "0.00" },
                  { label: "Vacaciones", value: "0.00" },
                  { label: "Incapacidad", value: "0.00" },
                  { label: "Total días nominales", value: "0.00" },
                ].map((item) => (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    key={item.label}
                  >
                    <Box sx={{ width: 160 }}>
                      <Typography>{item.label}</Typography>
                    </Box>
                    <TextField
                      defaultValue={item.value}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          width: 315,
                          textAlign: "right",
                          "& input": {
                            textAlign: "right",
                          },
                        },
                      }}
                      variant="outlined"
                    />
                  </Stack>
                ))}
              </Stack>
            </Grid>

            {/* Columna derecha */}
            <Grid item xs={12} sm={6}>
              <Typography
                sx={{
                  fontWeight: "bold",
                  backgroundColor: "#d7d7d7",
                  marginTop: 2,
                  marginBottom: 3,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                Registro de incidencias
              </Typography>

              <Stack spacing={2}>
                {[
                  { label: "Horas trabajadas al 25%", value: "0.00" },
                  { label: "Horas trabajadas al 50%", value: "0.00" },
                  { label: "Horas trabajadas al 75%", value: "0.00" },
                  { label: "Horas trabajadas al 100%", value: "0.00" },
                  { label: "Ajustes", value: "0.00" },
                ].map((item) => (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    key={item.label}
                  >
                    <Box sx={{ width: 190 }}>
                      <Typography>{item.label}</Typography>
                    </Box>
                    <TextField
                      defaultValue={item.value}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          width: 315,
                          textAlign: "right",
                          "& input": {
                            textAlign: "right",
                          },
                        },
                      }}
                      variant="outlined"
                    />
                  </Stack>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollForm;
