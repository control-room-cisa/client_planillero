import React, { useState, useEffect, useMemo } from "react";
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
import type { Empleado } from "../../services/empleadoService";
import { PlanillaStatuses } from "../rrhh/planillaConstants";
import type { PlanillaStatus } from "../rrhh/planillaConstants";
import RegistroDiarioService from "../../services/registroDiarioService";
import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import { Chip, CircularProgress, InputAdornment } from "@mui/material";

const TimesheetReviewSupervisor: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Helpers de período (12-26) y (27-11)
  const clampToMidnight = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  const makeDate = (year: number, month: number, day: number) =>
    clampToMidnight(new Date(year, month, day));

  const getPeriodFromDate = (d: Date) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    if (day >= 12 && day <= 26) {
      return {
        start: makeDate(year, month, 12),
        end: makeDate(year, month, 26),
      };
    }
    if (day >= 27) {
      // 27 -> 11 del siguiente mes
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const nm = nextMonth % 12;
      return {
        start: makeDate(year, month, 27),
        end: makeDate(nextYear, nm, 11),
      };
    }
    // 1..11 -> 27 del mes anterior al 11 del actual
    const prevMonth = month - 1;
    const prevYear = prevMonth < 0 ? year - 1 : year;
    const pm = (prevMonth + 12) % 12;
    return {
      start: makeDate(prevYear, pm, 27),
      end: makeDate(year, month, 11),
    };
  };

  const today = useMemo(() => new Date(), []);
  const initialPeriod = useMemo(() => getPeriodFromDate(today), [today]);

  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(
    null
  );
  const [startDate, setStartDate] = useState<Date | null>(initialPeriod.start);
  const [endDate, setEndDate] = useState<Date | null>(initialPeriod.end);
  const [statusFilter, setStatusFilter] = useState<PlanillaStatus>("Pendiente");
  const { employees, loading: empLoading } = useEmployees();
  const [openFilters, setOpenFilters] = useState(!isMobile);

  // Completo badge state para empleado seleccionado
  const [completeLoading, setCompleteLoading] = useState(false);
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  const buildDaysRange = (s: Date | null, e: Date | null): string[] => {
    if (!s || !e) return [];
    const days: string[] = [];
    const cursor = clampToMidnight(s);
    const end = clampToMidnight(e);
    while (cursor.getTime() <= end.getTime()) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d2 = String(cursor.getDate()).padStart(2, "0");
      days.push(`${y}-${m}-${d2}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  };

  // Calcular si el período está completo (todas las fechas aprobadas)
  useEffect(() => {
    const run = async () => {
      if (!selectedEmployee || !startDate || !endDate) {
        setIsComplete(null);
        return;
      }
      setCompleteLoading(true);
      try {
        const days = buildDaysRange(startDate, endDate);
        const results = await Promise.all(
          days.map((fecha) =>
            RegistroDiarioService.getByDate(fecha, selectedEmployee.id).catch(
              () => null
            )
          )
        );
        // Regla de completado:
        // - Si cantidadHorasLaborables = 0 o esDiaLibre = true → no requiere aprobación
        // - Si existe registro y contiene horas extra → requiere aprobación true
        // - En otros casos (registro normal sin extra) requiere aprobación true
        const daysApproved = await Promise.all(
          results.map(async (r, idx) => {
            if (!r) {
              // No existe: se considera aprobado si el día no debería tener horas
              const ymd = days[idx];
              const horario = await CalcularHorasForFecha(
                selectedEmployee.id,
                ymd
              );
              const expected = horario?.cantidadHorasLaborables ?? 0;
              const isDiaLibre = horario?.esDiaLibre === true;
              return expected === 0 || isDiaLibre;
            }
            // Si no tiene extras y es día libre o expected 0 → aprobado implícito
            const ymd = r.fecha ?? days[idx];
            const horario = await CalcularHorasForFecha(
              selectedEmployee.id,
              ymd
            );
            const expected = horario?.cantidadHorasLaborables ?? 0;
            const isDiaLibre =
              r.esDiaLibre === true || horario?.esDiaLibre === true;
            const tieneExtras = (r.actividades || []).some(
              (a: any) => a.esExtra
            );
            if ((expected === 0 || isDiaLibre) && !tieneExtras) return true;
            // Caso general: requiere aprobado por supervisor
            return r.aprobacionSupervisor === true;
          })
        );
        const allApproved = daysApproved.every(Boolean);
        setIsComplete(allApproved);
      } catch (_e) {
        setIsComplete(null);
      } finally {
        setCompleteLoading(false);
      }
    };
    run();
  }, [selectedEmployee?.id, startDate?.getTime(), endDate?.getTime()]);

  // Helper para obtener horas esperadas/día libre del backend de cálculo
  const CalcularHorasForFecha = async (empleadoId: number, fecha: string) => {
    try {
      const h = await CalculoHorasTrabajoService.getHorarioTrabajo(
        empleadoId,
        fecha
      );
      return h as any;
    } catch (_e) {
      return null;
    }
  };

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
          onChange={(val) => {
            if (!val) {
              setStartDate(null);
              setEndDate(null);
              return;
            }
            const d = clampToMidnight(val as Date);
            const day = d.getDate();
            let newStart = d;
            let newEnd = d;
            if (day === 12) {
              newStart = makeDate(d.getFullYear(), d.getMonth(), 12);
              newEnd = makeDate(d.getFullYear(), d.getMonth(), 26);
            } else if (day === 27) {
              const nextMonth = (d.getMonth() + 1) % 12;
              const nextYear =
                d.getMonth() + 1 > 11 ? d.getFullYear() + 1 : d.getFullYear();
              newStart = makeDate(d.getFullYear(), d.getMonth(), 27);
              newEnd = makeDate(nextYear, nextMonth, 11);
            } else {
              // Snap al período correspondiente
              const p = getPeriodFromDate(d);
              newStart = p.start;
              newEnd = p.end;
            }
            setStartDate(newStart);
            setEndDate(newEnd);
          }}
          shouldDisableDate={(date) => {
            // Solo permitir 12 y 27
            const day = (date as Date).getDate();
            return !(day === 12 || day === 27);
          }}
          slotProps={{ textField: { size: "small", fullWidth: true } }}
        />
        <DatePicker
          label="Fecha fin"
          value={endDate}
          onChange={(val) => {
            if (!val) {
              setStartDate(null);
              setEndDate(null);
              return;
            }
            const d = clampToMidnight(val as Date);
            const day = d.getDate();
            let newStart = d;
            let newEnd = d;
            if (day === 26) {
              newStart = makeDate(d.getFullYear(), d.getMonth(), 12);
              newEnd = makeDate(d.getFullYear(), d.getMonth(), 26);
            } else if (day === 11) {
              const prevMonth = (d.getMonth() + 11) % 12;
              const prevYear =
                d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
              newStart = makeDate(prevYear, prevMonth, 27);
              newEnd = makeDate(d.getFullYear(), d.getMonth(), 11);
            } else {
              const p = getPeriodFromDate(d);
              newStart = p.start;
              newEnd = p.end;
            }
            setStartDate(newStart);
            setEndDate(newEnd);
          }}
          shouldDisableDate={(date) => {
            // Solo permitir 11 y 26
            const day = (date as Date).getDate();
            return !(day === 11 || day === 26);
          }}
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
            placeholder="Buscar colaborador"
            InputProps={{
              ...params.InputProps,
              startAdornment: <SearchIcon sx={{ mr: 1 }} />,
              endAdornment: (
                <InputAdornment position="end" sx={{ mr: 1 }}>
                  {completeLoading ? (
                    <CircularProgress size={16} />
                  ) : isComplete ? (
                    <Chip label="Completo" size="small" color="success" />
                  ) : null}
                </InputAdornment>
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
                Selecciona un colaborador
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default TimesheetReviewSupervisor;
