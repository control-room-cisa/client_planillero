import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Card,
  CardContent,
  Divider,
  Container,
  IconButton,
  FormControl,
  Grid,
  Button,
  CircularProgress,
  Alert,
  TextField,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { Empleado } from "../../../services/empleadoService";
import type { EmpleadoIndexItem, LayoutOutletCtx } from "../../Layout";
import { useHorasTrabajo } from "../../../hooks/useHorasTrabajo";
import DesgloseIncidenciasComponent from "./DesgloseIncidencias";

interface NominasDashboardProps {
  empleado?: Empleado;
  empleadosIndex?: EmpleadoIndexItem[]; // NUEVO: índice de navegación
  onPrevious?: () => void; // compat
  onNext?: () => void; // compat
  hasPrevious?: boolean; // compat
  hasNext?: boolean; // compat
}

const NominasDashboard: React.FC<NominasDashboardProps> = ({
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

  // 1) Origen de datos
  const empleadoInicial =
    empleadoProp ?? selectedEmpleado ?? location?.state?.empleado ?? null;
  const indiceEntrante: EmpleadoIndexItem[] =
    empleadosIndexProp ??
    empleadosIndexCtx ??
    location?.state?.empleadosIndex ??
    [];

  // Estado interno para moverse entre empleados sin depender del Layout
  const [empleado, setEmpleado] = React.useState<Empleado | null>(
    empleadoInicial
  );

  // Índice ordenado recibido (si no hay, no hay navegación)
  const [empleadosIndex] = React.useState<EmpleadoIndexItem[]>(
    indiceEntrante ?? []
  );

  // 2) Rango de fechas
  const [fechaInicio, setFechaInicio] = React.useState<string>("");
  const [fechaFin, setFechaFin] = React.useState<string>("");

  const rangoValido =
    !!fechaInicio && !!fechaFin && new Date(fechaFin) >= new Date(fechaInicio);

  // 3) Hook de horas (solo si rango válido y hay empleado)
  const { resumenHoras, loading, error, refetch } = useHorasTrabajo({
    empleadoId: empleado?.id || "",
    fechaInicio,
    fechaFin,
    enabled: !!empleado && rangoValido,
  });

  // 4) Navegación por índice
  const getCurrentIdx = React.useCallback(() => {
    if (!empleado || !empleadosIndex?.length) return -1;
    const byId = empleadosIndex.findIndex((x) => x.id === empleado.id);
    if (byId >= 0) return byId;
    // fallback por código si es necesario
    if ((empleado as any).codigo) {
      const byCodigo = empleadosIndex.findIndex(
        (x) => x.codigo && x.codigo === (empleado as any).codigo
      );
      return byCodigo;
    }
    return -1;
  }, [empleado, empleadosIndex]);

  const idx = getCurrentIdx();
  const hayPrev = idx > 0;
  const hayNext = idx >= 0 && idx < empleadosIndex.length - 1;

  const goPrev = () => {
    if (empleadosIndex?.length && hayPrev) {
      const prev = empleadosIndex[idx - 1];
      // aquí puedes resolver el objeto completo con tu store/API si lo requieres
      setEmpleado(
        (prevEmp) =>
          ({
            ...(prevEmp ?? ({} as any)),
            id: prev.id as any,
            codigo: prev.codigo ?? (prevEmp as any)?.codigo ?? null,
            nombre: prev.nombreCompleto.split(" ")[0] ?? "",
            apellido: prev.nombreCompleto.split(" ").slice(1).join(" "),
          } as Empleado)
      );
    } else if (onPrevious) {
      onPrevious(); // compat con implementación antigua
    }
  };

  const goNext = () => {
    if (empleadosIndex?.length && hayNext) {
      const next = empleadosIndex[idx + 1];
      setEmpleado(
        (prevEmp) =>
          ({
            ...(prevEmp ?? ({} as any)),
            id: next.id as any,
            codigo: next.codigo ?? (prevEmp as any)?.codigo ?? null,
            nombre: next.nombreCompleto.split(" ")[0] ?? "",
            apellido: next.nombreCompleto.split(" ").slice(1).join(" "),
          } as Empleado)
      );
    } else if (onNext) {
      onNext(); // compat
    }
  };

  // Guard: si no hay empleado
  if (!empleado) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            No hay colaborador seleccionado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona un colaborador desde la gestión de colaboradores para ver
            su nómina.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/rrhh/colaboradores")}
          >
            Ir a Gestión de Colaboradores
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Encabezado con info + nav */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
            {/* Prev */}
            <IconButton
              onClick={goPrev}
              disabled={!(empleadosIndex?.length ? hayPrev : hasPrevious)}
              sx={{
                color: "white",
                opacity: (empleadosIndex?.length ? hayPrev : hasPrevious)
                  ? 1
                  : 0.5,
                width: 20,
                height: 48,
                "& .MuiSvgIcon-root": { fontSize: 80 },
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>

            {/* Avatar + datos */}
            <Box
              sx={{ display: "flex", gap: 3, alignItems: "center", flex: 2 }}
            >
              <Avatar
                src={empleado.urlFotoPerfil || undefined}
                alt={`${empleado.nombre} ${empleado.apellido}`}
                sx={{ width: 80, height: 80, border: "3px solid white" }}
              >
                {empleado.nombre?.[0]}
              </Avatar>

              <Box>
                <Typography variant="h4" gutterBottom>
                  {empleado.nombre} {empleado.apellido}
                </Typography>
                <Typography variant="h6">
                  {empleado.cargo || "Sin cargo"}
                </Typography>
                <Typography variant="subtitle1">ID: {empleado.id}</Typography>
              </Box>
            </Box>

            {/* Rango de fechas */}
            <Box
              sx={{
                flex: 1.5,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 2,
              }}
            >
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <TextField
                  label="Fecha inicio"
                  type="date"
                  size="small"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    sx: { color: "rgba(255,255,255,0.7)" },
                  }}
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.3)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                    "& .MuiInputBase-input": { color: "white" },
                  }}
                />
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 190 }}>
                <TextField
                  label="Fecha fin"
                  type="date"
                  size="small"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    sx: { color: "rgba(255,255,255,0.7)" },
                  }}
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.3)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                    "& .MuiInputBase-input": { color: "white" },
                  }}
                />
              </FormControl>

              <Button
                variant="contained"
                disabled={!rangoValido || !empleado}
                onClick={() => refetch()}
                sx={{ ml: 1 }}
              >
                Aplicar
              </Button>
            </Box>

            {/* Next */}
            <IconButton
              onClick={goNext}
              disabled={!(empleadosIndex?.length ? hayNext : hasNext)}
              sx={{
                color: "white",
                opacity: (empleadosIndex?.length ? hayNext : hasNext) ? 1 : 0.5,
                width: 20,
                height: 48,
                "& .MuiSvgIcon-root": { fontSize: 80 },
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <NavigateNextIcon />
            </IconButton>
          </Box>

          {!rangoValido && (fechaInicio || fechaFin) && (
            <Alert sx={{ mt: 2 }} severity="warning">
              Selecciona un rango válido (la fecha fin debe ser mayor o igual a
              la fecha inicio).
            </Alert>
          )}
        </Paper>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
            <Button size="small" onClick={refetch} sx={{ ml: 2 }}>
              Reintentar
            </Button>
          </Alert>
        )}

        {/* Tarjetas informativas (sin cambios sustanciales) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Información Laboral
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Departamento:</strong>{" "}
                  {(empleado as any).departamento?.nombre ??
                    (empleado as any).departamento ??
                    "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Contrato:</strong>{" "}
                  {empleado.tipoContrato ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Horario:</strong>{" "}
                  {empleado.tipoHorario ?? "—"}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Información Bancaria
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Banco:</strong> {empleado.banco || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Cuenta:</strong>{" "}
                  {empleado.tipoCuenta || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Número de Cuenta:</strong>{" "}
                  {empleado.numeroCuenta || "No especificado"}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Información de Contacto
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Correo:</strong>{" "}
                  {empleado.correoElectronico || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Teléfono:</strong>{" "}
                  {empleado.telefono || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Dirección:</strong>{" "}
                  {empleado.direccion || "No especificada"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Información de días */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Información de Días
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : resumenHoras ? (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Días laborados:</strong>{" "}
                    {resumenHoras.conteoHoras.diasLaborados || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Vacaciones:</strong>{" "}
                    {resumenHoras.conteoHoras.diasVacaciones || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Total horas trabajadas:</strong>{" "}
                    {resumenHoras.conteoHoras.totalHorasTrabajadas || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Horas laborables:</strong>{" "}
                    {resumenHoras.conteoHoras.totalHorasLaborables || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Diferencia:</strong>{" "}
                    {resumenHoras.desgloseIncidencias.diferencia || 0}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Selecciona un rango de fechas y presiona “Aplicar”.
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Registro de incidencias */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Registro de Incidencias
          </Typography>
          <DesgloseIncidenciasComponent
            desglose={resumenHoras?.desgloseIncidencias || null}
            loading={loading}
          />
        </Box>

        {/* Deducciones (placeholder) */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Deducciones
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>{/* ... sin cambios */}</Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default NominasDashboard;
