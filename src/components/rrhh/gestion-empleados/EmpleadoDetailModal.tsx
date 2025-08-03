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
} from "@mui/material";
import { AttachFile as AttachFileIcon } from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";

interface EmpleadoDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  empleado?: Empleado | null;
}

const EmpleadoDetailModal: React.FC<EmpleadoDetailModalProps> = ({
  open,
  onClose,
  onEdit,
  empleado,
}) => {
  if (!empleado) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={empleado.urlFotoPerfil}
            alt={`${empleado.nombre} ${empleado.apellido}`}
            sx={{ width: 56, height: 56 }}
          >
            {empleado.nombre?.[0]}
          </Avatar>
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
                <Typography variant="h6" gutterBottom>
                  Información Personal
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Código:</strong> {empleado.codigo || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre de Usuario:</strong>{" "}
                    {empleado.nombreUsuario || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>DNI:</strong> {empleado.dni || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong>{" "}
                    {empleado.correoElectronico || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Teléfono:</strong> {empleado.telefono || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Dirección:</strong> {empleado.direccion || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Estado Civil:</strong>{" "}
                    {empleado.estadoCivil || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre del Cónyuge:</strong>{" "}
                    {empleado.nombreConyugue || "N/A"}
                  </Typography>
                  <Typography variant="body2">
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
                <Typography variant="h6" gutterBottom>
                  Información Laboral
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Departamento:</strong>{" "}
                    {empleado.departamento || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Cargo:</strong> {empleado.cargo || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Profesión:</strong> {empleado.profesion || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Sueldo:</strong> $
                    {empleado.sueldoMensual?.toLocaleString() || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tipo de Horario:</strong>{" "}
                    {empleado.tipoHorario || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tipo de Contrato:</strong>{" "}
                    {empleado.tipoContrato || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha de Ingreso:</strong>{" "}
                    {empleado.fechaInicioIngreso
                      ? new Date(
                          empleado.fechaInicioIngreso
                        ).toLocaleDateString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Estado:</strong>{" "}
                    {empleado.activo ? "Activo" : "Inactivo"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Información de Contacto de Emergencia */}
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contacto de Emergencia
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Nombre:</strong>{" "}
                    {empleado.nombreContactoEmergencia || "N/A"}
                  </Typography>
                  <Typography variant="body2">
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
                <Typography variant="h6" gutterBottom>
                  Información Bancaria
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Banco:</strong> {empleado.banco || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tipo de Cuenta:</strong>{" "}
                    {empleado.tipoCuenta || "N/A"}
                  </Typography>
                  <Typography variant="body2">
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
                <Typography variant="h6" gutterBottom>
                  Información Familiar
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Nombre de la Madre:</strong>{" "}
                    {empleado.nombreMadre || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre del Padre:</strong>{" "}
                    {empleado.nombrePadre || "N/A"}
                  </Typography>
                  <Typography variant="body2">
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
                <Typography variant="h6" gutterBottom>
                  Documentos
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {empleado.urlFotoPerfil && (
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      href={empleado.urlFotoPerfil}
                      target="_blank"
                      fullWidth
                    >
                      Ver Foto de Perfil
                    </Button>
                  )}
                  {empleado.urlCv && (
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      href={empleado.urlCv}
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
    </Dialog>
  );
};

export default EmpleadoDetailModal;
