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
  Menu,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  RequestPage as RequestPageIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";
import { getImageUrl } from "../../../utils/imageUtils";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedEmpleado, setSelectedEmpleado] =
    React.useState<Empleado | null>(null);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    empleado: Empleado
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedEmpleado(empleado);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEmpleado(null);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    handleMenuClose();
  };

  const fullName = (e: Empleado) =>
    `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim();

  // ✅ Lista ordenada alfabéticamente para la TABLA
  const sortedEmpleados: Empleado[] = React.useMemo(() => {
    return [...(empleados ?? [])].sort((a, b) =>
      fullName(a)
        .toLocaleLowerCase()
        .localeCompare(fullName(b).toLocaleLowerCase())
    );
  }, [empleados]);

  // ✅ Índice resumido basado en la lista ORDENADA (coincide con la vista)
  const empleadosIndex: EmpleadoIndexItem[] = React.useMemo(() => {
    return (sortedEmpleados ?? []).map((e) => ({
      id: e.id as unknown as number,
      codigo: e.codigo ?? null,
      nombreCompleto: fullName(e),
    }));
  }, [sortedEmpleados]);

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
              <TableCell
                sx={{
                  display: { xs: "none", sm: "table-cell" },
                }}
              >
                Código
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Empresa
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Departamento
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Cargo
              </TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={isMobile ? 3 : 7} align="center">
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
  if (!sortedEmpleados || sortedEmpleados.length === 0) {
    return (
      <TableContainer component={Paper}>
        {TopBar}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empleado</TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", sm: "table-cell" },
                }}
              >
                Código
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Empresa
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Departamento
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                Cargo
              </TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={isMobile ? 3 : 7} align="center">
                No hay colaboradores registrados
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // Tabla principal (usa lista ORDENADA)
  return (
    <TableContainer component={Paper}>
      {TopBar}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre del colaborador</TableCell>
            <TableCell
              sx={{
                display: { xs: "none", sm: "table-cell" },
              }}
            >
              Código
            </TableCell>
            <TableCell
              sx={{
                display: { xs: "none", md: "table-cell" },
              }}
            >
              Empresa
            </TableCell>
            <TableCell
              sx={{
                display: { xs: "none", md: "table-cell" },
              }}
            >
              Departamento
            </TableCell>
            <TableCell
              sx={{
                display: { xs: "none", md: "table-cell" },
              }}
            >
              Cargo
            </TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedEmpleados.map((empleado) => (
            <TableRow key={empleado.id}>
              <TableCell>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: 2 },
                  }}
                >
                  <Avatar
                    src={getImageUrl(empleado.urlFotoPerfil)}
                    alt={`${empleado.nombre} ${empleado.apellido}`}
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 },
                    }}
                  >
                    {empleado.nombre?.[0]}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                    >
                      {empleado.nombre} {empleado.apellido}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: { xs: "none", sm: "block" } }}
                    >
                      {empleado.correoElectronico}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>

              <TableCell
                sx={{
                  display: { xs: "none", sm: "table-cell" },
                }}
              >
                {empleado.codigo || "-"}
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                {(empleado as any).empresa?.nombre ?? empleado.empresaId ?? "-"}
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                {(empleado as any).departamento?.nombre ??
                  (empleado as any).departamento ??
                  "-"}
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", md: "table-cell" },
                }}
              >
                {empleado.cargo || "-"}
              </TableCell>

              <TableCell>
                <Chip
                  label={empleado.activo ? "Activo" : "Inactivo"}
                  color={empleado.activo ? "success" : "default"}
                  size="small"
                />
              </TableCell>

              <TableCell align="center">
                {isMobile ? (
                  <>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, empleado)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={
                        Boolean(anchorEl) &&
                        selectedEmpleado?.id === empleado.id
                      }
                      onClose={handleMenuClose}
                    >
                      <MenuItem
                        onClick={() =>
                          handleMenuAction(() => onView(selectedEmpleado!))
                        }
                      >
                        <VisibilityIcon sx={{ mr: 1, fontSize: 20 }} />
                        Ver detalles
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          handleMenuAction(() => onEdit(selectedEmpleado!))
                        }
                      >
                        <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                        Editar
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          handleMenuAction(() =>
                            onDelete(selectedEmpleado!.id as number)
                          )
                        }
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                        Eliminar
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          handleMenuAction(() => {
                            if (onOpenNominas) {
                              onOpenNominas(selectedEmpleado!, empleadosIndex);
                            } else {
                              onNominaClick(selectedEmpleado!);
                            }
                          })
                        }
                      >
                        <RequestPageIcon sx={{ mr: 1, fontSize: 20 }} />
                        Nóminas
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      onClick={() => onView(empleado)}
                      title="Ver detalles"
                      size="small"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => onEdit(empleado)}
                      title="Editar"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => onDelete(empleado.id as number)}
                      title="Eliminar"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                    <IconButton
                      color="info"
                      onClick={() => {
                        if (onOpenNominas) {
                          // ✅ Pasamos el índice ORDENADO para navegación en Nóminas
                          onOpenNominas(empleado, empleadosIndex);
                        } else {
                          // Compatibilidad con implementación existente
                          onNominaClick(empleado);
                        }
                      }}
                      title="Nóminas"
                      size="small"
                    >
                      <RequestPageIcon />
                    </IconButton>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EmpleadosList;
