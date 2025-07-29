import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  Button,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import { FilterList as FilterIcon } from "@mui/icons-material";
import { PlanillaStatuses, type PlanillaStatus } from "./rrhh/planillaConstants";
import ViewEmployeeApproved from "./ViewEmployeeApproved";

const TimesheetReviewEmployee: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Rango por defecto: última semana
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState<Date | null>(lastWeek);
  const [endDate, setEndDate] = useState<Date | null>(today);
  const [statusFilter, setStatusFilter] = useState<PlanillaStatus>("Pendiente");
  const [openFilters, setOpenFilters] = useState(!isMobile);

  // Ajusta apertura al cambiar a móvil/escritorio
  React.useEffect(() => {
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

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Estado
        </Typography>
        <Box>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PlanillaStatus)}
            style={{ width: "100%", padding: 8, borderRadius: 4 }}
          >
            {PlanillaStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Box>
      </Paper>

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
              bottom: 0,
              left: 0,
              borderRadius: 0,
              borderColor: "divider",
            }}
          >
            {filterContent}
          </Paper>
        )}

        {/* Panel derecho - Contenido */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            position: "relative",
            overflowY: "auto",
          }}
        >
          {isMobile && (
            <IconButton
              onClick={() => setOpenFilters(true)}
              sx={{ position: "absolute", top: 16, left: 16 }}
            >
              <FilterIcon />
            </IconButton>
          )}

          <ViewEmployeeApproved
            startDate={startDate}
            endDate={endDate}
            status={statusFilter}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default TimesheetReviewEmployee;