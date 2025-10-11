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
  Container,
} from "@mui/material";
import {
  Person as PersonIcon,
  FilterList as FilterIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import PlanillaDetallePreview from "./PlanillaDetallePreview";
import type { Empleado } from "../../services/empleadoService";
import { PlanillaStatuses } from "../rrhh/planillaConstants";
import type { PlanillaStatus } from "../rrhh/planillaConstants";
import RegistroDiarioService from "../../services/registroDiarioService";
import { Chip, CircularProgress } from "@mui/material";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { EmpleadoIndexItem, LayoutOutletCtx } from "../Layout";
import EmpleadoService from "../../services/empleadoService";

interface TimesheetReviewSupervisorProps {
  empleado?: Empleado;
  empleadosIndex?: EmpleadoIndexItem[];
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const TimesheetReviewSupervisor: React.FC<TimesheetReviewSupervisorProps> = ({
  empleado: empleadoProp,
  empleadosIndex: empleadosIndexProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { selectedEmpleado, empleadosIndex: empleadosIndexCtx } =
    useOutletContext<LayoutOutletCtx>();

  const { searchTerm } = location.state ?? {};

  const goBackToList = () => {
    navigate("/supervision/planillas", {
      state: {
        searchTerm,
      },
    });
  };

  const empleadoInicial =
    empleadoProp ?? selectedEmpleado ?? location?.state?.empleado ?? null;

  const indiceEntrante: EmpleadoIndexItem[] =
    empleadosIndexProp ??
    empleadosIndexCtx ??
    location?.state?.empleadosIndex ??
    [];

  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(
    empleadoInicial
  );

  const empleadosIndex: EmpleadoIndexItem[] = React.useMemo(
    () => indiceEntrante ?? [],
    [indiceEntrante]
  );
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

  const [startDate, setStartDate] = useState<Date | null>(initialPeriod.start);
  const [endDate, setEndDate] = useState<Date | null>(initialPeriod.end);
  const [statusFilter, setStatusFilter] = useState<PlanillaStatus>("Pendiente");
  const [openFilters, setOpenFilters] = useState(!isMobile);

  // Navegación entre empleados
  const currentIndex = empleadosIndex.findIndex(
    (e) => e.id === selectedEmployee?.id
  );
  const canGoPrevious =
    onPrevious !== undefined ? hasPrevious : currentIndex > 0;
  const canGoNext =
    onNext !== undefined ? hasNext : currentIndex < empleadosIndex.length - 1;

  const handlePrevious = async () => {
    if (onPrevious) {
      onPrevious();
      return;
    }
    if (currentIndex > 0) {
      const prevId = empleadosIndex[currentIndex - 1].id;
      const emp = await EmpleadoService.getById(prevId);
      setSelectedEmployee(emp);
    }
  };

  const handleNext = async () => {
    if (onNext) {
      onNext();
      return;
    }
    if (currentIndex < empleadosIndex.length - 1) {
      const nextId = empleadosIndex[currentIndex + 1].id;
      const emp = await EmpleadoService.getById(nextId);
      setSelectedEmployee(emp);
    }
  };

  // Estado del período para empleado seleccionado
  const [completeLoading, setCompleteLoading] = useState(false);
  const [periodStatus, setPeriodStatus] = useState<
    "completo" | "pendiente_aprobacion" | "pendiente_registro" | null
  >(null);

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

  // Calcular el estado del período (completo, pendiente aprobación, pendiente registro)
  useEffect(() => {
    const run = async () => {
      if (!selectedEmployee || !startDate || !endDate) {
        setPeriodStatus(null);
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

        // Estados posibles:
        // 1. "completo" - Todos los días están registrados y aprobados
        // 2. "pendiente_aprobacion" - Todos los días tienen registro pero faltan aprobaciones
        // 3. "pendiente_registro" - Faltan registros por guardar
        //
        // IMPORTANTE: Los días libres también deben registrarse y aprobarse
        // porque pueden contener horas extras

        let haySinRegistro = false;
        let hayConRegistroSinAprobar = false;
        let todosAprobados = true;

        await Promise.all(
          results.map(async (_r) => {
            // TODOS los días del período requieren registro y aprobación
            // (incluyendo días libres, por posibles horas extras)

            const r = _r;
            if (!r) {
              // No hay registro → falta guardar
              haySinRegistro = true;
              todosAprobados = false;
              return;
            }

            // Hay registro, verificar aprobación
            if (r.aprobacionSupervisor !== true) {
              hayConRegistroSinAprobar = true;
              todosAprobados = false;
            }
          })
        );

        // Determinar estado final
        if (todosAprobados) {
          setPeriodStatus("completo");
        } else if (haySinRegistro) {
          setPeriodStatus("pendiente_registro");
        } else if (hayConRegistroSinAprobar) {
          setPeriodStatus("pendiente_aprobacion");
        } else {
          setPeriodStatus(null);
        }
      } catch (_e) {
        setPeriodStatus(null);
      } finally {
        setCompleteLoading(false);
      }
    };
    run();
  }, [selectedEmployee?.id, startDate?.getTime(), endDate?.getTime()]);

  // (sin helpers)

  // Ajusta apertura al cambiar a móvil/escritorio
  useEffect(() => {
    setOpenFilters(!isMobile);
  }, [isMobile]);

  const filterContent = (
    <Box
      sx={{
        width: 300,
        pt: 1,
        px: 2,
        pb: 2,
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

      {/* Badge de estado del período */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {completeLoading ? (
          <CircularProgress size={24} />
        ) : periodStatus === "completo" ? (
          <Chip label="Completo" size="small" color="success" />
        ) : periodStatus === "pendiente_aprobacion" ? (
          <Chip label="Pendiente de Aprobación" size="small" color="warning" />
        ) : periodStatus === "pendiente_registro" ? (
          <Chip label="Registros Pendientes" size="small" color="error" />
        ) : null}
      </Box>

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
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header con navegación */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={goBackToList} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">
              {selectedEmployee
                ? `${selectedEmployee.nombre} ${selectedEmployee.apellido}`
                : "Actividades Diarias"}
            </Typography>
            {selectedEmployee?.codigo && (
              <Chip label={selectedEmployee.codigo} size="small" />
            )}
          </Box>

          {/* Navegación entre empleados */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              size="small"
            >
              <NavigateBeforeIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {currentIndex + 1} / {empleadosIndex.length}
            </Typography>
            <IconButton onClick={handleNext} disabled={!canGoNext} size="small">
              <NavigateNextIcon />
            </IconButton>
          </Box>
        </Paper>

        <Box
          sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
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
                  borderTop: "1px solid",
                  borderColor: "divider",
                },
              }}
            >
              {filterContent}
            </Drawer>
          ) : (
            <Paper
              sx={{
                width: 300,
                flexShrink: 0,
                height: "100%",
                borderRadius: 0,
                borderColor: "divider",
                overflow: "hidden",
                borderTop: "1px solid",
                boxShadow: "inset 0 1px rgba(0,0,0,0.06)",
              }}
            >
              {/* Quitar espacio superior en filtros para pegar al header */}
              <Box sx={{ pt: 0 }}>{filterContent}</Box>
            </Paper>
          )}

          {/* Panel derecho - Contenido */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              px: 2,
              pt: 2,
              pb: 2,
              position: "relative",
              overflow: "hidden",
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
      </Container>
    </LocalizationProvider>
  );
};

export default TimesheetReviewSupervisor;
