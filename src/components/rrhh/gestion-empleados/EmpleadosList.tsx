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
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  RequestPage as RequestPageIcon,
} from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";

// Opcional: índice simple para navegación en Nóminas
export type EmpleadoIndexItem = {
  id: number;
  codigo?: string | null;
  nombreCompleto: string;
};

type EmpresaOption = { id: number; nombre: string };

interface EmpleadosListProps {
  empleados: Empleado[];
  loading: boolean;
  onView: (empleado: Empleado) => void;
  onEdit: (empleado: Empleado) => void;
  onDelete: (id: number) => void;
  onNominaClick: (empleado: Empleado) => void;

  // ⚠️ Opcionales para no romper si el filtro se maneja en otro archivo
  empresas?: EmpresaOption[];
  selectedEmpresaId?: number | "";
  onEmpresaChange?: (empresaId: number) => void;

  // Opcional: abrir nóminas con índice ordenado
  onOpenNominas?: (
    empleado: Empleado,
    empleadosIndex: EmpleadoIndexItem[]
  ) => void;
}

const EmpleadosList: React.FC<EmpleadosListProps> = ({
  empleados,
  loading,
  onView,
  onEdit,
  onDelete,
  onNominaClick,

  // Defaults seguros (evitan `.map` sobre undefined)
  empresas = [],
  selectedEmpresaId = "",
  onEmpresaChange = () => {},

  onOpenNominas,
}) => {
  // Índice básico ordenado alfabéticamente por nombre completo
  const empleadosIndex: EmpleadoIndexItem[] = React.useMemo(() => {
    return (empleados ?? [])
      .map((e) => ({
        id: e.id as number,
        codigo: e.codigo ?? null,
        nombreCompleto: `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim(),
      }))
      .sort((a, b) =>
        a.nombreCompleto
          .toLocaleLowerCase()
          .localeCompare(b.nombreCompleto.toLocaleLowerCase())
      );
  }, [empleados]);

  // TopBar con selector de empresa (solo si te pasan `empresas`)
  const TopBar = (empresas?.length ?? 0) > 0 && (
    <Toolbar sx={{ px: 2, gap: 2, justifyContent: "space-between" }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Colaboradores
      </Typography>

      <FormControl size="small" sx={{ minWidth: 260 }}>
        <InputLabel>Empresa</InputLabel>
        <Select
          label="Empresa"
          value={selectedEmpresaId}
          onChange={(e) => {
            const v = e.target.value as number | "";
            if (v !== "") onEmpresaChange(Number(v));
          }}
        >
          {/* Placeholder deshabilitado: fuerza selección */}
          <MenuItem value="" disabled>
            Selecciona una empresa
          </MenuItem>
          {(empresas ?? []).map((emp) => (
            <MenuItem key={emp.id} value={emp.id}>
              {emp.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Toolbar>
  );

  // Loading
  if (loading) {
    return (
      <TableContainer component={Paper}>
        {TopBar}
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

  // Si te pasaron `empresas`, bloquea la tabla hasta que seleccionen una
  if (
    (empresas?.length ?? 0) > 0 &&
    (selectedEmpresaId === "" || selectedEmpresaId === null)
  ) {
    return (
      <TableContainer component={Paper}>
        {TopBar}
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="info">
            Selecciona una empresa para listar los colaboradores.
          </Alert>
        </Box>
      </TableContainer>
    );
  }

  // Sin empleados
  if (!empleados || empleados.length === 0) {
    return (
      <TableContainer component={Paper}>
        {TopBar}
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
                No hay colaboradores registrados
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // Tabla principal
  return (
    <TableContainer component={Paper}>
      {TopBar}
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
          {empleados.map((empleado) => (
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
                  onClick={() => onDelete(empleado.id as number)}
                  title="Eliminar"
                >
                  <DeleteIcon />
                </IconButton>
                <IconButton
                  color="info"
                  onClick={() => {
                    if (onOpenNominas) {
                      onOpenNominas(empleado, empleadosIndex);
                    } else {
                      // compatibilidad si aún usas onNominaClick
                      onNominaClick(empleado);
                    }
                  }}
                  title="Nóminas"
                >
                  <RequestPageIcon />
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
