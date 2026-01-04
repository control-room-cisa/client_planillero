import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import {
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Emergency as EmergencyIcon,
  AccountBalance as AccountBalanceIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";
import { getImageUrl } from "../../../utils/imageUtils";

interface EmpleadoDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  empleado?: Empleado | null;
}

/**
 * Mapea el tipo de horario del enum de Prisma a su descripción legible
 * Los valores coinciden con el @map del enum TipoHorario en schema.prisma
 */
const getTipoHorarioLabel = (tipoHorario?: string | null): string => {
  if (!tipoHorario) return "N/A";

  const horarioMap: Record<string, string> = {
    H1_1: "(H1.1) Lunes a Viernes",
    H1_2: "(H1.2) Martes a Sábado",
    H1_3: "(H1.3) Miércoles a Domingo",
    H1_4: "(H1.4) Días alternos Cocina",
    H1_5: "(H1.5) Días alternos Medio Ambiente",
    H1_6: "(H1.6) Lunes a Sábado",
    H2_1: "(H2.1) Turnos 7x7 Copenergy",
    H2_2: "(H2.2) Lunes a Viernes Copenergy",
  };

  return horarioMap[tipoHorario] || tipoHorario;
};

const EmpleadoDetailModal: React.FC<EmpleadoDetailModalProps> = ({
  open,
  onClose,
  onEdit,
  empleado,
}) => {
  const [openImageModal, setOpenImageModal] = React.useState(false);
  if (!empleado) return null;

  const estadoChip = (
    <Chip
      label={empleado.activo ? "Activo" : "Inactivo"}
      color={empleado.activo ? "success" : "error"}
      variant="outlined"
      size="small"
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            onClick={() => setOpenImageModal(true)}
            sx={{ cursor: "pointer" }}
          >
            <Avatar
              src={getImageUrl(empleado.urlFotoPerfil)}
              alt={`${empleado.nombre} ${empleado.apellido}`}
              sx={{ width: 56, height: 56 }}
            >
              {empleado.nombre?.[0]}
            </Avatar>
          </Box>
          <Box>
            <Typography variant="h6">
              {empleado.nombre} {empleado.apellido}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {empleado.cargo}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          {/* Información Personal */}
          <Box>
            <Card>
              <CardContent>
                <Typography
                  color="primary"
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <PersonIcon fontSize="small" />
                  Información Personal
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography>
                    <strong>Código:</strong> {empleado.codigo || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Nombre de Usuario:</strong>{" "}
                    {empleado.nombreUsuario || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>DNI:</strong> {empleado.dni || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Email:</strong>{" "}
                    {empleado.correoElectronico || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Teléfono:</strong> {empleado.telefono || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Dirección:</strong> {empleado.direccion || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Estado Civil:</strong>{" "}
                    {empleado.estadoCivil || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Nombre del Cónyuge:</strong>{" "}
                    {empleado.nombreConyugue || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Condición de Salud:</strong>{" "}
                    {empleado.condicionSalud || "N/A"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Información Laboral */}
          <Box>
            <Card>
              <CardContent>
                <Typography
                  color="primary"
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <WorkIcon fontSize="small" />
                  Información Laboral
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography>
                    <strong>Departamento:</strong>{" "}
                    {empleado.departamento || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Cargo:</strong> {empleado.cargo || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Profesión:</strong> {empleado.profesion || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Sueldo:</strong> L{" "}
                    {empleado.sueldoMensual?.toFixed(2) || "N/A"}
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
                      ? new Date(
                          empleado.fechaInicioIngreso
                        ).toLocaleDateString()
                      : "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Estado:</strong> {estadoChip}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Contacto de Emergencia */}
          <Box>
            <Card>
              <CardContent>
                <Typography
                  color="primary"
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <EmergencyIcon fontSize="small" />
                  Contacto de Emergencia
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography>
                    <strong>Nombre:</strong>{" "}
                    {empleado.nombreContactoEmergencia || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Teléfono:</strong>{" "}
                    {empleado.numeroContactoEmergencia || "N/A"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Información Bancaria */}
          <Box>
            <Card>
              <CardContent>
                <Typography
                  color="primary"
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <AccountBalanceIcon fontSize="small" />
                  Información Bancaria
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography>
                    <strong>Banco:</strong> {empleado.banco || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Tipo de Cuenta:</strong>{" "}
                    {empleado.tipoCuenta || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Número de Cuenta:</strong>{" "}
                    {empleado.numeroCuenta || "N/A"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Información Familiar */}
          <Box>
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  color="primary"
                >
                  <FamilyRestroomIcon fontSize="small" />
                  Información Familiar
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Documentos */}
          <Box>
            <Card>
              <CardContent>
                <Typography
                  color="primary"
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <DescriptionIcon fontSize="small" />
                  Documentos
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {empleado.urlFotoPerfil && (
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      onClick={() => setOpenImageModal(true)}
                      fullWidth
                    >
                      Ver Foto de Perfil
                    </Button>
                  )}
                  {empleado.urlCv && (
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      href={getImageUrl(empleado.urlCv) || empleado.urlCv}
                      target="_blank"
                      fullWidth
                    >
                      Ver CV
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button onClick={onEdit} variant="contained" color="primary">
          Editar Colaborador
        </Button>
      </DialogActions>

      {/* Modal de imagen grande */}
      <Dialog
        open={openImageModal}
        onClose={() => setOpenImageModal(false)}
        maxWidth="md"
      >
        <DialogContent sx={{ p: 0 }}>
          <img
            src={getImageUrl(empleado.urlFotoPerfil) || ""}
            alt="Foto de perfil"
            style={{ width: "100%", height: "auto" }}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default EmpleadoDetailModal;
