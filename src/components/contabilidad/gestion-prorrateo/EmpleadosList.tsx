import * as React from "react";
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
  Alert,
} from "@mui/material";
import { AccountBalance as AccountBalanceIcon } from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";

interface EmpleadosListProps {
  empleados: Empleado[];
  loading: boolean;
  onProrrateoClick: (empleado: Empleado) => void;
}

const EmpleadosList: React.FC<EmpleadosListProps> = ({
  empleados,
  loading,
  onProrrateoClick,
}) => {
  const fullName = (e: Empleado) =>
    `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim();

  // Lista ordenada alfabéticamente
  const sortedEmpleados: Empleado[] = React.useMemo(() => {
    return [...(empleados ?? [])].sort((a, b) =>
      fullName(a)
        .toLocaleLowerCase()
        .localeCompare(fullName(b).toLocaleLowerCase())
    );
  }, [empleados]);

  // Loading
  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empleado</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Cargo</TableCell>
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

  // Sin empleados
  if (!sortedEmpleados || sortedEmpleados.length === 0) {
    return (
      <TableContainer component={Paper}>
        <Box sx={{ p: 2 }}>
          <Alert severity="info">
            Selecciona una empresa para listar los colaboradores.
          </Alert>
        </Box>
      </TableContainer>
    );
  }

  // Tabla principal
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre del colaborador</TableCell>
            <TableCell>Código</TableCell>
            <TableCell>Empresa</TableCell>
            <TableCell>Departamento</TableCell>
            <TableCell>Cargo</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedEmpleados.map((empleado) => (
            <TableRow key={empleado.id}>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={empleado.urlFotoPerfil || undefined}
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
              <TableCell>
                {(empleado as any).empresa?.nombre ?? empleado.empresaId ?? "-"}
              </TableCell>
              <TableCell>
                {(empleado as any).departamento?.nombre ??
                  (empleado as any).departamento ??
                  "-"}
              </TableCell>
              <TableCell>{empleado.cargo || "-"}</TableCell>

              <TableCell>
                <Chip
                  label={empleado.activo ? "Activo" : "Inactivo"}
                  color={empleado.activo ? "success" : "default"}
                  size="small"
                />
              </TableCell>

              <TableCell align="center">
                <IconButton
                  color="info"
                  onClick={() => onProrrateoClick(empleado)}
                  title="Prorrateo"
                >
                  <AccountBalanceIcon />
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

