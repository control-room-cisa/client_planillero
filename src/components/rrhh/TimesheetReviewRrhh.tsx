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
  CircularProgress,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Person as PersonIcon,
  FilterList as FilterIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import PlanillaDetallePreview from "./PlanillaDetallePreviewRrhh";
import type { Empleado } from "../../services/empleadoService";
import EmpleadoService from "../../services/empleadoService";
import { empresaService } from "../../services/empresaService";
import type { Empresa } from "../../types/auth";
import { PlanillaStatuses } from "./planillaConstants";
import type { PlanillaStatus } from "./planillaConstants";

const TimesheetReviewRrhh: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Rango por defecto: última semana
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(
    null
  );
  const [startDate, setStartDate] = useState<Date | null>(lastWeek);
  const [endDate, setEndDate] = useState<Date | null>(today);
  const [statusFilter, setStatusFilter] = useState<PlanillaStatus>("Pendiente");
  const [openFilters, setOpenFilters] = useState(!isMobile);

  // Estado para empresas y empleados
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Cargar empresas al iniciar
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        setLoadingEmpresas(true);
        const response = await empresaService.getEmpresas();
        if (response.success) {
          setEmpresas(response.data);
        }
      } catch (error) {
        console.error("Error al cargar empresas:", error);
      } finally {
        setLoadingEmpresas(false);
      }
    };

    fetchEmpresas();
  }, []);

  // Cargar empleados solo si hay una empresa seleccionada
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        if (selectedEmpresa) {
          const empleados = await EmpleadoService.getAll(selectedEmpresa.id);
          setEmployees(empleados);
        } else {
          // Si no hay empresa seleccionada, no cargar empleados
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error al cargar empleados:", error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [selectedEmpresa]);

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

      {/* Filtro de empresa */}
      <Autocomplete
        options={empresas.filter((empresa) => empresa.esConsorcio !== false)}
        getOptionLabel={(opt) => opt.nombre || ""}
        loading={loadingEmpresas}
        onChange={(_, value) => {
          setSelectedEmpresa(value);
          setSelectedEmployee(null); // Resetear empleado seleccionado al cambiar empresa
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Empresa"
            placeholder="Seleccionar empresa"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <BusinessIcon sx={{ mr: 1, color: "action.active" }} />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loadingEmpresas ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            fullWidth
          />
        )}
      />

      {/* Filtro de empleado */}
      <Autocomplete
        options={employees}
        getOptionLabel={(opt) => `${opt.nombre} ${opt.apellido}`}
        loading={loadingEmployees}
        value={selectedEmployee}
        onChange={(_, value) => setSelectedEmployee(value)}
        noOptionsText="No hay resultados"
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Colaborador"
            placeholder="Buscar colaborador"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <PersonIcon sx={{ mr: 1, color: "action.active" }} />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loadingEmployees ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
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
                Selecciona un colaborador
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default TimesheetReviewRrhh;
