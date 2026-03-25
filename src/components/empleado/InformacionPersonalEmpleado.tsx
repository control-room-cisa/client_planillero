import * as React from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import EventIcon from "@mui/icons-material/Event";
import { useAuth } from "../../hooks/useAuth";
import EmpleadoService, { type Empleado } from "../../services/empleadoService";
import { getImageUrl } from "../../utils/imageUtils";
import { getTipoHorarioLabel } from "../../enums/tipoHorario";

function safeToNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDias(horas: number | null | undefined): number | null {
  if (horas === null || horas === undefined) return null;
  return horas / 8;
}

export default function InformacionPersonalEmpleado() {
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [empleado, setEmpleado] = React.useState<Empleado | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
        const emp = await EmpleadoService.getById(user.id);
        setEmpleado(emp);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Error al cargar información personal");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [user?.id]);

  const vacacionesHoras = safeToNumber(empleado?.tiempoVacacionesHoras);
  const compensatorioHoras = safeToNumber(
    empleado?.tiempoCompensatorioHoras
  );

  const vacacionesDias = toDias(vacacionesHoras);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!empleado) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No se encontró tu información.</Typography>
      </Box>
    );
  }

  const estadoChip = (
    <Chip
      label={empleado.activo ? "Activo" : "Inactivo"}
      color={empleado.activo ? "success" : "error"}
      variant="outlined"
      size="small"
    />
  );

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        height: "100%",
        p: { xs: 2, md: 3 },
        maxWidth: 1200,
        mx: "auto",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
        <Avatar
          src={getImageUrl(empleado.urlFotoPerfil)}
          alt={`${empleado.nombre} ${empleado.apellido || ""}`}
          sx={{ width: 74, height: 74 }}
        >
          {empleado.nombre?.[0]}
        </Avatar>

        <Box>
          <Typography variant="h5" fontWeight="bold">
            {empleado.nombre} {empleado.apellido || ""}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <Typography variant="body2" color="text.secondary">
              {empleado.cargo || "Sin cargo"}
            </Typography>
            {estadoChip}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <Typography variant="body2" color="text.secondary">
              <strong>Código:</strong> {empleado.codigo || "N/A"}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonIcon fontSize="small" />
              Información Personal
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Nombre de Usuario:</strong>{" "}
                {empleado.nombreUsuario || "N/A"}
              </Typography>
              <Typography>
                <strong>DNI:</strong> {empleado.dni || "N/A"}
              </Typography>
              <Typography>
                <strong>Email:</strong> {empleado.correoElectronico || "N/A"}
              </Typography>
              <Typography>
                <strong>Teléfono:</strong> {empleado.telefono || "N/A"}
              </Typography>
              <Typography>
                <strong>Dirección:</strong> {empleado.direccion || "N/A"}
              </Typography>

              <Typography>
                <strong>Estado Civil:</strong> {empleado.estadoCivil || "N/A"}
              </Typography>
              <Typography>
                <strong>Nombre del Cónyuge:</strong>{" "}
                {empleado.nombreConyugue || "N/A"}
              </Typography>
              <Typography>
                <strong>Condición de Salud:</strong>{" "}
                {empleado.condicionSalud || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <WorkIcon fontSize="small" />
              Información Laboral
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Departamento:</strong> {empleado.departamento || "N/A"}
              </Typography>
              <Typography>
                <strong>Cargo:</strong> {empleado.cargo || "N/A"}
              </Typography>
              <Typography>
                <strong>Sueldo:</strong>{" "}
                {empleado.sueldoMensual !== undefined && empleado.sueldoMensual !== null
                  ? `L ${empleado.sueldoMensual.toFixed(2)}`
                  : "N/A"}
              </Typography>
              <Typography>
                <strong>Tipo de Horario:</strong>{" "}
                {getTipoHorarioLabel(empleado.tipoHorario)}
              </Typography>
              <Typography>
                <strong>Tipo de Contrato:</strong>{" "}
                {empleado.tipoContrato || "N/A"}
              </Typography>
              <Typography>
                <strong>Fecha de Ingreso:</strong>{" "}
                {empleado.fechaInicioIngreso
                  ? new Date(empleado.fechaInicioIngreso).toLocaleDateString()
                  : "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <EventIcon fontSize="small" />
              Vacaciones y Tiempo Compensatorio
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Vacaciones:</strong>{" "}
                {vacacionesHoras !== null
                  ? `${vacacionesDias?.toFixed(2)} días (${vacacionesHoras} horas)`
                  : "N/A"}
              </Typography>
              <Typography>
                <strong>Tiempo Compensatorio:</strong>{" "}
                {compensatorioHoras !== null
                  ? `${compensatorioHoras} horas`
                  : "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonAddIcon fontSize="small" />
              Contacto de Emergencia
            </Typography>
            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Nombre:</strong>{" "}
                {empleado.nombreContactoEmergencia || "N/A"}
              </Typography>
              <Typography>
                <strong>Teléfono:</strong>{" "}
                {empleado.numeroContactoEmergencia || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <AccountBalanceIcon fontSize="small" />
              Información Bancaria
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Banco:</strong> {empleado.banco || "N/A"}
              </Typography>
              <Typography>
                <strong>Tipo de Cuenta:</strong> {empleado.tipoCuenta || "N/A"}
              </Typography>
              <Typography>
                <strong>Número de Cuenta:</strong>{" "}
                {empleado.numeroCuenta || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <FamilyRestroomIcon fontSize="small" />
              Información Familiar
            </Typography>
            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Nombre de la Madre:</strong>{" "}
                {empleado.nombreMadre || "N/A"}
              </Typography>
              <Typography>
                <strong>Nombre del Padre:</strong>{" "}
                {empleado.nombrePadre || "N/A"}
              </Typography>
              <Typography>
                <strong>Beneficiario por Muerte:</strong>{" "}
                {empleado.muerteBeneficiario || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

