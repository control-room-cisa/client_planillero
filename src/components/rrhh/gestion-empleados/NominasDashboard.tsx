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
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { Empleado } from "../../../services/empleadoService";
import type { LayoutOutletCtx } from "../../Layout";

// Si quieres mantener compat. con llamadas antiguas que pasen props,
// puedes dejar las props opcionales
interface NominasDashboardProps {
  empleado?: Empleado;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const NominasDashboard: React.FC<NominasDashboardProps> = ({
  empleado: empleadoProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const navigate = useNavigate();
  // Trae el empleado seleccionado desde el Outlet Context del Layout
  const { selectedEmpleado } = useOutletContext<LayoutOutletCtx>();

  // Usar el del contexto por defecto; si alguien inyecta por props, lo respetamos
  const empleado = empleadoProp ?? selectedEmpleado ?? null;

  const [selectedDate, setSelectedDate] = React.useState<string>("");

  // Fechas de ejemplo - idealmente esto vendría de la API
  const fechasCorte = ["2024-03-15", "2024-03-31", "2024-04-15", "2024-04-30"];

  // Guard: si no hay empleado (por ejemplo se recargó la página)
  if (!empleado) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            No hay colaborador seleccionado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona un colaborador desde la gestión de colaboradores para ver su nómina.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/rrhh/colaboradores")}>
            Ir a Gestión de Colaboradores
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Encabezado con información básica del empleado */}
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
            {/* Botón Anterior */}
            <IconButton
              onClick={onPrevious}
              disabled={!hasPrevious}
              sx={{
                color: "white",
                opacity: hasPrevious ? 1 : 0.5,
                width: 20,
                height: 48,
                "& .MuiSvgIcon-root": { fontSize: 80 },
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>

            {/* Avatar y datos del empleado */}
            <Box sx={{ display: "flex", gap: 3, alignItems: "center", flex: 2 }}>
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
                <Typography variant="h6">{empleado.cargo || "Sin cargo"}</Typography>
                <Typography variant="subtitle1">ID: {empleado.id}</Typography>
              </Box>
            </Box>

            {/* Selector de fecha de corte */}
            <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem" }}>
                  Fecha de Corte
                </InputLabel>
                <Select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  label="Fecha de Corte"
                  sx={{
                    color: "white",
                    fontSize: "0.875rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.5)" },
                    "& .MuiSvgIcon-root": { color: "white" },
                  }}
                >
                  {fechasCorte.map((fecha) => (
                    <MenuItem key={fecha} value={fecha}>
                      {new Date(fecha).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Botón Siguiente */}
            <IconButton
              onClick={onNext}
              disabled={!hasNext}
              sx={{
                color: "white",
                opacity: hasNext ? 1 : 0.5,
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
        </Paper>

        {/* Tarjetas de información */}
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
                  {(empleado as any).departamento?.nombre ?? (empleado as any).departamento ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Contrato:</strong> {empleado.tipoContrato ?? "—"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tipo de Horario:</strong> {empleado.tipoHorario ?? "—"}
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
                  <strong>Tipo de Cuenta:</strong> {empleado.tipoCuenta || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Número de Cuenta:</strong> {empleado.numeroCuenta || "No especificado"}
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
                  <strong>Correo:</strong> {empleado.correoElectronico || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Teléfono:</strong> {empleado.telefono || "No especificado"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Dirección:</strong> {empleado.direccion || "No especificada"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Información de días (placeholder) */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Información de Días
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs:12, md:4}}>
                <Typography variant="body1" gutterBottom>
                  <strong>Días laborados:</strong> 22
                </Typography>
              </Grid>
              <Grid size={{ xs:12, md:4}}>
                <Typography variant="body1" gutterBottom>
                  <strong>Vacaciones:</strong> 0
                </Typography>
              </Grid>
              <Grid size={{ xs:12, md:4}}>
                <Typography variant="body1" gutterBottom>
                  <strong>Excedente IHSS:</strong> L. 1,500.00
                </Typography>
              </Grid>
              <Grid size={{ xs:12, md:4}}>
                <Typography variant="body1" gutterBottom>
                  <strong>Monto cubre la empresa:</strong> L. 15,000.00
                </Typography>
              </Grid>
              <Grid size={{ xs:12, md:4}}>
                <Typography variant="body1" gutterBottom>
                  <strong>Subtotal:</strong> L. 16,500.00
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Registro de incidencias (placeholder) */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Registro de Incidencias
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
              gap: 2,
              mt: 2,
            }}
          >
            {[
              { label: "Normal", hours: 0, percentage: "0%" },
              { label: "25%", hours: 8, percentage: "25%" },
              { label: "50%", hours: 4, percentage: "50%" },
              { label: "75%", hours: 2, percentage: "75%" },
              { label: "100%", hours: 1, percentage: "100%" },
            ].map((item) => (
              <Card key={item.label} sx={{ textAlign: "center" }}>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {item.label}
                  </Typography>
                  <Typography variant="h4">{item.hours}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    horas ({item.percentage})
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Deducciones (placeholder) */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Deducciones
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Grid container spacing={3}>
              {[
                { label: "IHSS", amount: 1200 },
                { label: "ISR", amount: 2500 },
                { label: "RAP", amount: 800 },
                { label: "Alimentación", amount: 1500 },
                { label: "Cobro préstamo", amount: 2000 },
                { label: "Impuesto Vecinal", amount: 300 },
                { label: "Otros", amount: 0 },
              ].map((deduction) => (
                <Grid size={{xs:12, sm:6, md:4 }} key={deduction.label}>
                  <Typography variant="body1" gutterBottom>
                    <strong>{deduction.label}:</strong> L. {deduction.amount.toFixed(2)}
                  </Typography>
                </Grid>
              ))}
              <Grid size={{ xs:12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6">
                  <strong>Total Deducciones:</strong> L. {(8300).toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default NominasDashboard;
