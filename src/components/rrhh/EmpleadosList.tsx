import React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Typography,
  Avatar,
  Box,
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import type { Empleado } from "../../services/empleadoService";

interface EmpleadosListProps {
  empleados: Empleado[];
  loading: boolean;
  onView: (empleado: Empleado) => void;
  onEdit: (empleado: Empleado) => void;
  onDelete: (id: number) => void;
}

const EmpleadosList: React.FC<EmpleadosListProps> = ({
  empleados,
  loading,
  onView,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empleado</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (empleados.length === 0) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empleado</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} align="center">
                No hay colaboradores registrados
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Empleado</TableCell>
            <TableCell>Código</TableCell>
            <TableCell>Departamento</TableCell>
            <TableCell>Cargo</TableCell>
            <TableCell>Contacto</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {empleados.map((empleado) => (
            <TableRow key={empleado.id}>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={empleado.urlFotoPerfil}
                    alt={`${empleado.nombre} ${empleado.apellido}`}
                  >
                    {empleado.nombre?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {empleado.nombre} {empleado.apellido}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {empleado.correoElectronico}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{empleado.codigo || "-"}</TableCell>
              <TableCell>{empleado.departamento || "-"}</TableCell>
              <TableCell>{empleado.cargo || "-"}</TableCell>
              <TableCell>
                <Typography variant="body2">
                  {empleado.telefono || "-"}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={empleado.activo ? "Activo" : "Inactivo"}
                  color={empleado.activo ? "success" : "default"}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">
                <IconButton
                  color="primary"
                  onClick={() => onView(empleado)}
                  title="Ver detalles"
                >
                  <VisibilityIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={() => onEdit(empleado)}
                  title="Editar"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => onDelete(empleado.id)}
                  title="Eliminar"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EmpleadosList;
