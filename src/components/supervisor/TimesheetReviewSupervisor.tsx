import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Avatar,
  MenuItem,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import { useEmployees } from "../employeeByDepartament";
import PlanillaDetallePreview from "./PlanillaDetallePreview";
import type { Employee } from "../../types/auth";

// Tipo y lista para estados de planilla (Sin "Todos")
export type PlanillaStatus = "Pendiente" | "Aprobado" | "Rechazado";
export const PlanillaStatuses: PlanillaStatus[] = [
  "Pendiente",
  "Aprobado",
  "Rechazado",
];

const TimesheetReviewSupervisor: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Rango por defecto: última semana
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [startDate, setStartDate] = useState<Date | null>(lastWeek);
  const [endDate, setEndDate] = useState<Date | null>(today);
  const [statusFilter, setStatusFilter] = useState<PlanillaStatus>("Pendiente");
  const { employees, loading: empLoading } = useEmployees();
  const [openFilters, setOpenFilters] = useState(!isMobile);

  // Ajusta apertura al cambiar a móvil/escritorio
  useEffect(() => {
    setOpenFilters(!isMobile);
  }, [isMobile]);

  const filterContent = (
    <Box
      sx={{
        width: 300,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowX: "hidden",
      }}
    >
      <Typography variant="h6" display="flex" alignItems="center">
        <FilterIcon sx={{ mr: 1 }} /> Filtros
      </Typography>

      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <DatePicker
          label="Fecha inicio"
          value={startDate}
          onChange={setStartDate}
          slotProps={{ textField: { size: "small", fullWidth: true } }}
        />
        <DatePicker
          label="Fecha fin"
          value={endDate}
          onChange={setEndDate}
          slotProps={{ textField: { size: "small", fullWidth: true } }}
        />
      </LocalizationProvider>

      <Autocomplete
        options={employees}
        getOptionLabel={(opt) => `${opt.nombre} ${opt.apellido}`}
        loading={empLoading}
        onChange={(_, value) => setSelectedEmployee(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder="Buscar empleado"
            InputProps={{
              ...params.InputProps,
              startAdornment: <SearchIcon sx={{ mr: 1 }} />,
            }}
            fullWidth
          />
        )}
      />

      <TextField
        select
        size="small"
        label="Estado"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as PlanillaStatus)}
      >
        {PlanillaStatuses.map((status) => (
          <MenuItem key={status} value={status}>
            {status}
          </MenuItem>
        ))}
      </TextField>

      {isMobile && (
        <Button variant="contained" onClick={() => setOpenFilters(false)}>
          Aplicar filtros
        </Button>
      )}
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ display: "flex", height: "100vh" }}>
        {/* Filtros: Drawer en móvil, panel fijo en escritorio */}
        {isMobile ? (
          <Drawer
            open={openFilters}
            onClose={() => setOpenFilters(false)}
            variant="temporary"
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: {
                width: 300,
                position: "fixed",
                top: "56px",
                bottom: 0,
                left: isMobile ? 0 : "240px",
                overflowY: "auto",
                overflowX: "hidden",
              },
            }}
          >
            {filterContent}
          </Drawer>
        ) : (
          <Paper
            sx={{
              // width: 300,
              // position: "fixed",
              // top: "64px",
              bottom: 0,
              left: 0,
              borderRadius: 0,
              // borderRight: "1px solid",
              borderColor: "divider",
              // display: "flex",
              // flexDirection: "column",
              // overflowY: "auto",
              // overflowX: "hidden",
            }}
          >
            {filterContent}
          </Paper>
        )}

        {/* Panel derecho - Contenido */}
        <Box
          sx={{
            flex: 1,
            // ml: isMobile ? 0 : "300px",
            p: 2,
            position: "relative",
            overflowY: "auto",
          }}
        >
          {/* Botón para abrir filtros en móvil */}
          {isMobile && (
            <IconButton
              onClick={() => setOpenFilters(true)}
              sx={{ position: "absolute", top: 16, left: 16 }}
            >
              <FilterIcon />
            </IconButton>
          )}

          {selectedEmployee ? (
            <PlanillaDetallePreview
              empleado={selectedEmployee}
              startDate={startDate}
              endDate={endDate}
              status={statusFilter}
            />
          ) : (
            <Box textAlign="center" mt={10}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  bgcolor: "primary.main",
                }}
              >
                <PersonIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" mt={2}>
                Selecciona un empleado
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default TimesheetReviewSupervisor;
