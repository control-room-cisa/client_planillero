import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  SupervisorAccount as SupervisorIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import * as React from "react";

import PlanillaAccesoRevisionService, {
  type PlanillaAccesoRevision,
  type CreatePlanillaAccesoRevisionDto,
  type UpdatePlanillaAccesoRevisionDto,
} from "../../services/planillaAccesoRevisionService";
import EmpleadoService, { type Empleado } from "../../services/empleadoService";
import { empresaService } from "../../services/empresaService";
import type { Empresa } from "../../types/auth";

const PlanillaAccesoRevisionManagement: React.FC = () => {
  // Estados
  const [accesos, setAccesos] = useState<PlanillaAccesoRevision[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [loadingSupervisores, setLoadingSupervisores] = useState(false);
  const [loadingEmpleadosDialog, setLoadingEmpleadosDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [filterSupervisorId, setFilterSupervisorId] = useState<string>("");
  const [filterEmpleadoId, setFilterEmpleadoId] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAcceso, setCurrentAcceso] =
    useState<PlanillaAccesoRevision | null>(null);
  const [formData, setFormData] = useState<CreatePlanillaAccesoRevisionDto>({
    supervisorId: 0,
    empleadoId: 0,
  });
  // Estados para empresas en el diálogo
  const [supervisorEmpresaId, setSupervisorEmpresaId] = useState<string>("");
  const [empleadoEmpresaId, setEmpleadoEmpresaId] = useState<string>("");
  const [supervisores, setSupervisores] = useState<Empleado[]>([]);
  const [empleadosDialog, setEmpleadosDialog] = useState<Empleado[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Función para mostrar notificaciones
  const showSnackbar = React.useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({
        open: true,
        message,
        severity,
      });
    },
    []
  );

  // Funciones para cargar datos
  const fetchAccesos = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: {
        supervisorId?: number;
        empleadoId?: number;
      } = {};

      if (filterSupervisorId) {
        filters.supervisorId = Number(filterSupervisorId);
      }
      if (filterEmpleadoId) {
        filters.empleadoId = Number(filterEmpleadoId);
      }

      const data = await PlanillaAccesoRevisionService.getAll(filters);
      setAccesos(data);
    } catch (err) {
      console.error("Error al cargar accesos:", err);
      showSnackbar("Error al cargar los accesos de planilla", "error");
    } finally {
      setLoading(false);
    }
  }, [filterSupervisorId, filterEmpleadoId, showSnackbar]);

  const fetchEmpleados = React.useCallback(async () => {
    if (!selectedEmpresaId) {
      setEmpleados([]);
      return;
    }
    setLoadingEmpleados(true);
    try {
      const empresaId = parseInt(selectedEmpresaId);
      const data = await EmpleadoService.getAll(empresaId);
      setEmpleados(data);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      showSnackbar("Error al cargar los empleados", "error");
    } finally {
      setLoadingEmpleados(false);
    }
  }, [selectedEmpresaId, showSnackbar]);

  const fetchEmpresas = React.useCallback(async () => {
    try {
      const response = await empresaService.getEmpresas();
      if (response.success) {
        // Filtrar solo empresas con esConsorcio === true
        const empresasConsorcio = response.data.filter(
          (empresa) => empresa.esConsorcio === true
        );
        setEmpresas(empresasConsorcio);
      }
    } catch (err) {
      console.error("Error al cargar empresas:", err);
      showSnackbar("Error al cargar las empresas", "error");
    }
  }, [showSnackbar]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  useEffect(() => {
    fetchAccesos();
  }, [fetchAccesos]);

  // Funciones para el manejo del formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: Number(value),
    });
  };

  const resetForm = () => {
    setFormData({
      supervisorId: 0,
      empleadoId: 0,
    });
    setCurrentAcceso(null);
    setIsEditing(false);
    setSupervisorEmpresaId("");
    setEmpleadoEmpresaId("");
    setSupervisores([]);
    setEmpleadosDialog([]);
  };

  // Cargar supervisores por empresa
  const fetchSupervisores = React.useCallback(async (empresaId: string) => {
    if (!empresaId) {
      setSupervisores([]);
      return;
    }
    setLoadingSupervisores(true);
    try {
      const empresaIdNum = parseInt(empresaId);
      const data = await EmpleadoService.getAll(empresaIdNum);
      setSupervisores(data);
    } catch (err) {
      console.error("Error al cargar supervisores:", err);
      showSnackbar("Error al cargar los supervisores", "error");
    } finally {
      setLoadingSupervisores(false);
    }
  }, [showSnackbar]);

  // Cargar empleados por empresa para el diálogo
  const fetchEmpleadosDialog = React.useCallback(async (empresaId: string) => {
    if (!empresaId) {
      setEmpleadosDialog([]);
      return;
    }
    setLoadingEmpleadosDialog(true);
    try {
      const empresaIdNum = parseInt(empresaId);
      const data = await EmpleadoService.getAll(empresaIdNum);
      setEmpleadosDialog(data);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      showSnackbar("Error al cargar los empleados", "error");
    } finally {
      setLoadingEmpleadosDialog(false);
    }
  }, [showSnackbar]);

  const handleOpenDialog = async (acceso?: PlanillaAccesoRevision) => {
    if (acceso) {
      setIsEditing(true);
      setCurrentAcceso(acceso);
      setFormData({
        supervisorId: acceso.supervisorId,
        empleadoId: acceso.empleadoId,
      });
      
      // Si el acceso tiene supervisor y empleado con empresa, cargar sus empresas
      // Primero intentar obtener empresaId de la relación
      let supervisorEmpId = acceso.supervisor?.empresaId;
      let empleadoEmpId = acceso.empleado?.empresaId;
      
      // Si no está en la relación, obtener los empleados completos
      if (!supervisorEmpId && acceso.supervisorId) {
        try {
          const supervisorCompleto = await EmpleadoService.getById(acceso.supervisorId);
          supervisorEmpId = supervisorCompleto.empresaId;
        } catch (err) {
          console.error("Error al obtener supervisor completo:", err);
        }
      }
      
      if (!empleadoEmpId && acceso.empleadoId) {
        try {
          const empleadoCompleto = await EmpleadoService.getById(acceso.empleadoId);
          empleadoEmpId = empleadoCompleto.empresaId;
        } catch (err) {
          console.error("Error al obtener empleado completo:", err);
        }
      }
      
      // Establecer las empresas y cargar los empleados
      if (supervisorEmpId) {
        setSupervisorEmpresaId(supervisorEmpId.toString());
        fetchSupervisores(supervisorEmpId.toString());
      }
      if (empleadoEmpId) {
        setEmpleadoEmpresaId(empleadoEmpId.toString());
        fetchEmpleadosDialog(empleadoEmpId.toString());
      }
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  // Funciones CRUD
  const handleCreateAcceso = async () => {
    try {
      if (formData.supervisorId === formData.empleadoId) {
        showSnackbar(
          "El supervisor y el colaborador supervisado no pueden ser la misma persona",
          "error"
        );
        return;
      }
      
      // Validar que la combinación no exista ya
      const accesosExistentes = await PlanillaAccesoRevisionService.getAll();
      const existeCombinacion = accesosExistentes.some(
        (acceso) =>
          acceso.supervisorId === formData.supervisorId &&
          acceso.empleadoId === formData.empleadoId
      );
      
      if (existeCombinacion) {
        showSnackbar(
          "Ya existe un acceso de planilla para este supervisor y colaborador supervisado. La combinación debe ser única.",
          "error"
        );
        return;
      }
      
      await PlanillaAccesoRevisionService.create(formData);
      showSnackbar("Acceso de planilla creado exitosamente", "success");
      handleCloseDialog();
      fetchAccesos();
    } catch (err: any) {
      console.error("Error al crear acceso:", err);
      // Verificar si el error es por combinación duplicada
      const errorMessage = err.message || "";
      if (
        errorMessage.includes("Ya existe un acceso") ||
        errorMessage.includes("ya existe") ||
        errorMessage.includes("duplicate")
      ) {
        showSnackbar(
          "Ya existe un acceso de planilla para este supervisor y colaborador supervisado. La combinación debe ser única.",
          "error"
        );
      } else {
        showSnackbar(errorMessage || "Error al crear el acceso de planilla", "error");
      }
    }
  };

  const handleUpdateAcceso = async () => {
    if (!currentAcceso) return;

    try {
      if (formData.supervisorId === formData.empleadoId) {
        showSnackbar(
          "El supervisor y el colaborador supervisado no pueden ser la misma persona",
          "error"
        );
        return;
      }
      
      // Validar que la combinación no exista ya (excepto el actual)
      const accesosExistentes = await PlanillaAccesoRevisionService.getAll();
      const existeCombinacion = accesosExistentes.some(
        (acceso) =>
          acceso.id !== currentAcceso.id &&
          acceso.supervisorId === formData.supervisorId &&
          acceso.empleadoId === formData.empleadoId
      );
      
      if (existeCombinacion) {
        showSnackbar(
          "Ya existe un acceso de planilla para este supervisor y colaborador supervisado. La combinación debe ser única.",
          "error"
        );
        return;
      }
      
      const updateData: UpdatePlanillaAccesoRevisionDto = {
        supervisorId: formData.supervisorId,
        empleadoId: formData.empleadoId,
      };
      await PlanillaAccesoRevisionService.update(currentAcceso.id, updateData);
      showSnackbar("Acceso de planilla actualizado exitosamente", "success");
      handleCloseDialog();
      fetchAccesos();
    } catch (err: any) {
      console.error("Error al actualizar acceso:", err);
      // Verificar si el error es por combinación duplicada
      const errorMessage = err.message || "";
      if (
        errorMessage.includes("Ya existe un acceso") ||
        errorMessage.includes("ya existe") ||
        errorMessage.includes("duplicate")
      ) {
        showSnackbar(
          "Ya existe un acceso de planilla para este supervisor y colaborador supervisado. La combinación debe ser única.",
          "error"
        );
      } else {
        showSnackbar(
          errorMessage || "Error al actualizar el acceso de planilla",
          "error"
        );
      }
    }
  };

  const handleDeleteAcceso = async (id: number) => {
    if (
      window.confirm("¿Está seguro que desea eliminar este acceso de planilla?")
    ) {
      try {
        await PlanillaAccesoRevisionService.delete(id);
        showSnackbar("Acceso de planilla eliminado exitosamente", "success");
        fetchAccesos();
      } catch (err: any) {
        console.error("Error al eliminar acceso:", err);
        showSnackbar(
          err.message || "Error al eliminar el acceso de planilla",
          "error"
        );
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filtrar accesos por término de búsqueda
  const filteredAccesos = accesos.filter((acceso) => {
    if (!searchTerm) return true;
    
    const supervisorNombre = acceso.supervisor
      ? `${acceso.supervisor.nombre} ${acceso.supervisor.apellido || ""}`.toLowerCase()
      : "";
    const empleadoNombre = acceso.empleado
      ? `${acceso.empleado.nombre} ${acceso.empleado.apellido || ""}`.toLowerCase()
      : "";
    const supervisorCodigo = acceso.supervisor?.codigo?.toLowerCase() || "";
    const empleadoCodigo = acceso.empleado?.codigo?.toLowerCase() || "";

    const matchesSearchTerm =
      supervisorNombre.includes(searchTerm.toLowerCase()) ||
      empleadoNombre.includes(searchTerm.toLowerCase()) ||
      supervisorCodigo.includes(searchTerm.toLowerCase()) ||
      empleadoCodigo.includes(searchTerm.toLowerCase()) ||
      acceso.supervisorId.toString().includes(searchTerm) ||
      acceso.empleadoId.toString().includes(searchTerm);

    return matchesSearchTerm;
  });

  // Función para formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Función para obtener el nombre completo del empleado (definida antes del useMemo)
  const getEmpleadoNombre = React.useCallback((empleado: Empleado) => {
    return `${empleado.nombre} ${empleado.apellido || ""}`.trim();
  }, []);

  // Agrupar accesos por supervisor
  const accesosAgrupados = React.useMemo(() => {
    const grupos = new Map<number, {
      supervisor: Empleado | undefined;
      supervisorId: number;
      accesos: PlanillaAccesoRevision[];
    }>();

    filteredAccesos.forEach((acceso) => {
      if (!grupos.has(acceso.supervisorId)) {
        grupos.set(acceso.supervisorId, {
          supervisor: acceso.supervisor,
          supervisorId: acceso.supervisorId,
          accesos: [],
        });
      }
      grupos.get(acceso.supervisorId)!.accesos.push(acceso);
    });

    // Ordenar por nombre del supervisor y luego por nombre del colaborador
    return Array.from(grupos.values())
      .sort((a, b) => {
        const nombreA = a.supervisor
          ? getEmpleadoNombre(a.supervisor).toLowerCase()
          : "";
        const nombreB = b.supervisor
          ? getEmpleadoNombre(b.supervisor).toLowerCase()
          : "";
        return nombreA.localeCompare(nombreB);
      })
      .map((grupo) => ({
        ...grupo,
        accesos: grupo.accesos.sort((a, b) => {
          const nombreA = a.empleado
            ? getEmpleadoNombre(a.empleado).toLowerCase()
            : "";
          const nombreB = b.empleado
            ? getEmpleadoNombre(b.empleado).toLowerCase()
            : "";
          return nombreA.localeCompare(nombreB);
        }),
      }));
  }, [filteredAccesos, getEmpleadoNombre]);

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ flexShrink: 0 }}>
        Gestión de Accesos de Planilla
      </Typography>

      {/* Filtros y búsqueda */}
      <Box sx={{ display: "flex", flexWrap: "wrap", mb: 3, gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Empresa</InputLabel>
          <Select
            value={selectedEmpresaId}
            label="Empresa"
            onChange={(e) => {
              setSelectedEmpresaId(e.target.value);
              setFilterSupervisorId("");
              setFilterEmpleadoId("");
            }}
          >
            <MenuItem value="">
              <em>Todas las empresas</em>
            </MenuItem>
            {empresas.map((empresa) => (
              <MenuItem key={empresa.id} value={empresa.id.toString()}>
                {empresa.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} size="small" disabled={!selectedEmpresaId || loadingEmpleados}>
          <InputLabel>Filtrar por Supervisor</InputLabel>
          <Select
            value={filterSupervisorId}
            label="Filtrar por Supervisor"
            onChange={(e) => {
              const value = e.target.value;
              setFilterSupervisorId(value);
              // Si se selecciona un supervisor, limpiar el filtro de colaborador
              if (value) {
                setFilterEmpleadoId("");
              }
            }}
          >
            <MenuItem value="">
              <em>Todos los supervisores</em>
            </MenuItem>
            {empleados.map((empleado) => (
              <MenuItem key={empleado.id} value={empleado.id.toString()}>
                {getEmpleadoNombre(empleado)} {empleado.codigo && `(${empleado.codigo})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} size="small" disabled={!selectedEmpresaId || loadingEmpleados}>
          <InputLabel>Filtrar por Colaborador Supervisado</InputLabel>
          <Select
            value={filterEmpleadoId}
            label="Filtrar por Colaborador Supervisado"
            onChange={(e) => {
              const value = e.target.value;
              setFilterEmpleadoId(value);
              // Si se selecciona un colaborador, limpiar el filtro de supervisor
              if (value) {
                setFilterSupervisorId("");
              }
            }}
          >
            <MenuItem value="">
              <em>Todos los colaboradores</em>
            </MenuItem>
            {empleados.map((empleado) => (
              <MenuItem key={empleado.id} value={empleado.id.toString()}>
                {getEmpleadoNombre(empleado)} {empleado.codigo && `(${empleado.codigo})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Buscar por nombre o código"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "action.active" }} />
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Acceso
        </Button>
      </Box>

      {/* Tabla de Accesos con scroll interno */}
      <TableContainer component={Paper} sx={{ flex: 1, minHeight: 0 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Colaborador Supervisado</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Fecha de Creación</TableCell>
              <TableCell>Última Actualización</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : accesosAgrupados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay accesos de planilla registrados
                </TableCell>
              </TableRow>
            ) : (
              accesosAgrupados.map((grupo, grupoIndex) => (
                <React.Fragment key={grupo.supervisorId}>
                  {/* Fila de encabezado del supervisor */}
                  <TableRow
                    sx={{
                      backgroundColor: "action.hover",
                      "& .MuiTableCell-root": {
                        borderBottom: "2px solid",
                        borderBottomColor: "divider",
                        fontWeight: "bold",
                      },
                    }}
                  >
                    <TableCell colSpan={5}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <SupervisorIcon color="primary" fontSize="medium" />
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {grupo.supervisor
                              ? getEmpleadoNombre(grupo.supervisor)
                              : `ID: ${grupo.supervisorId}`}
                          </Typography>
                          {grupo.supervisor?.codigo && (
                            <Typography variant="caption" color="text.secondary">
                              Código: {grupo.supervisor.codigo}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({grupo.accesos.length} colaborador{grupo.accesos.length !== 1 ? "es" : ""})
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {/* Filas de colaboradores supervisados */}
                  {grupo.accesos.map((acceso, accesoIndex) => (
                    <TableRow
                      key={acceso.id}
                      sx={{
                        backgroundColor: accesoIndex % 2 === 0 ? "background.default" : "action.hover",
                        "&:hover": {
                          backgroundColor: "action.selected",
                        },
                      }}
                    >
                      <TableCell>
                        {/* Colaborador supervisado con indentación para mostrar jerarquía */}
                        <Box sx={{ pl: 3, display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 2,
                              height: 20,
                              backgroundColor: "primary.main",
                              opacity: 0.3,
                              mr: 1,
                              borderRadius: 1,
                            }}
                          />
                          <PersonIcon color="action" fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {acceso.empleado
                                ? getEmpleadoNombre(acceso.empleado)
                                : `ID: ${acceso.empleadoId}`}
                            </Typography>
                            {acceso.empleado?.codigo && (
                              <Typography variant="caption" color="text.secondary">
                                {acceso.empleado.codigo}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {acceso.empleado?.cargo || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(acceso.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(acceso.updatedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(acceso)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteAcceso(acceso.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Espaciado entre grupos */}
                  {grupoIndex < accesosAgrupados.length - 1 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ height: 16, border: "none" }} />
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para crear/editar */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Editar Acceso de Planilla" : "Crear Nuevo Acceso de Planilla"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {/* Selector de empresa para supervisor */}
            <FormControl fullWidth required>
              <InputLabel>Empresa del Supervisor</InputLabel>
              <Select
                value={supervisorEmpresaId}
                label="Empresa del Supervisor"
                onChange={(e) => {
                  const empresaId = e.target.value;
                  setSupervisorEmpresaId(empresaId);
                  setFormData({ ...formData, supervisorId: 0 });
                  if (empresaId) {
                    fetchSupervisores(empresaId);
                  } else {
                    setSupervisores([]);
                  }
                }}
              >
                <MenuItem value="">
                  <em>Seleccione una empresa</em>
                </MenuItem>
                {empresas
                  .filter((empresa) => empresa.esConsorcio === true)
                  .map((empresa) => (
                    <MenuItem key={empresa.id} value={empresa.id.toString()}>
                      {empresa.nombre}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Selector de supervisor */}
            <FormControl fullWidth required>
              <InputLabel>Supervisor</InputLabel>
              <Select
                name="supervisorId"
                value={formData.supervisorId || ""}
                label="Supervisor"
                onChange={handleInputChange}
                disabled={!supervisorEmpresaId || loadingSupervisores}
              >
                <MenuItem value="">
                  <em>
                    {!supervisorEmpresaId
                      ? "Primero seleccione una empresa"
                      : loadingSupervisores
                      ? "Cargando..."
                      : "Seleccione un supervisor"}
                  </em>
                </MenuItem>
                {supervisores.map((empleado) => (
                  <MenuItem key={empleado.id} value={empleado.id}>
                    {getEmpleadoNombre(empleado)} {empleado.codigo && `(${empleado.codigo})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Selector de empresa para colaborador supervisado */}
            <FormControl fullWidth required>
              <InputLabel>Empresa del Colaborador Supervisado</InputLabel>
              <Select
                value={empleadoEmpresaId}
                label="Empresa del Colaborador Supervisado"
                onChange={(e) => {
                  const empresaId = e.target.value;
                  setEmpleadoEmpresaId(empresaId);
                  setFormData({ ...formData, empleadoId: 0 });
                  if (empresaId) {
                    fetchEmpleadosDialog(empresaId);
                  } else {
                    setEmpleadosDialog([]);
                  }
                }}
              >
                <MenuItem value="">
                  <em>Seleccione una empresa</em>
                </MenuItem>
                {empresas
                  .filter((empresa) => empresa.esConsorcio === true)
                  .map((empresa) => (
                    <MenuItem key={empresa.id} value={empresa.id.toString()}>
                      {empresa.nombre}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Selector de colaborador supervisado */}
            <FormControl fullWidth required>
              <InputLabel>Colaborador Supervisado</InputLabel>
              <Select
                name="empleadoId"
                value={formData.empleadoId || ""}
                label="Colaborador Supervisado"
                onChange={handleInputChange}
                disabled={!empleadoEmpresaId || loadingEmpleadosDialog}
              >
                <MenuItem value="">
                  <em>
                    {!empleadoEmpresaId
                      ? "Primero seleccione una empresa"
                      : loadingEmpleadosDialog
                      ? "Cargando..."
                      : "Seleccione un colaborador"}
                  </em>
                </MenuItem>
                {empleadosDialog
                  .filter((emp) => emp.id !== formData.supervisorId)
                  .map((empleado) => (
                    <MenuItem key={empleado.id} value={empleado.id}>
                      {getEmpleadoNombre(empleado)} {empleado.codigo && `(${empleado.codigo})`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {formData.supervisorId === formData.empleadoId &&
              formData.supervisorId !== 0 && (
                <Alert severity="error">
                  El supervisor y el colaborador supervisado no pueden ser la misma persona
                </Alert>
              )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={isEditing ? handleUpdateAcceso : handleCreateAcceso}
            variant="contained"
            color="primary"
            disabled={
              !supervisorEmpresaId ||
              !empleadoEmpresaId ||
              !formData.supervisorId ||
              !formData.empleadoId ||
              formData.supervisorId === formData.empleadoId ||
              loadingSupervisores ||
              loadingEmpleadosDialog
            }
          >
            {isEditing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlanillaAccesoRevisionManagement;

