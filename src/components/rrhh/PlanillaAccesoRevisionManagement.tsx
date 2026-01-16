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
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Add as AddIcon,
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
import ConfirmDialog from "../common/ConfirmDialog";
import { Roles } from "../../enums/roles";

const PlanillaAccesoRevisionManagement: React.FC = () => {
  // Estados
  const [accesos, setAccesos] = useState<PlanillaAccesoRevision[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSupervisores, setLoadingSupervisores] = useState(false);
  const [loadingEmpleadosDialog, setLoadingEmpleadosDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    accesoId: number | null;
  }>({
    open: false,
    accesoId: null,
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
      const data = await PlanillaAccesoRevisionService.getAll();
      setAccesos(data);
    } catch (err) {
      console.error("Error al cargar accesos:", err);
      showSnackbar("Error al cargar los accesos de planilla", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

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
    fetchAccesos();
  }, [fetchAccesos]);

  // Handler específico para Select de Material-UI
  const handleSelectChange = (event: SelectChangeEvent<number>) => {
    const { name, value } = event.target;
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

  // Cargar supervisores por empresa (solo roles permitidos)
  const fetchSupervisores = React.useCallback(
    async (empresaId: string) => {
      if (!empresaId) {
        setSupervisores([]);
        return;
      }
      setLoadingSupervisores(true);
      try {
        const empresaIdNum = parseInt(empresaId);
        const data = await EmpleadoService.getAll(empresaIdNum);
        // Filtrar solo empleados con roles permitidos para ser supervisores
        const supervisoresPermitidos = data.filter(
          (empleado) =>
            empleado.rolId === Roles.SUPERVISOR ||
            empleado.rolId === Roles.SUPERVISOR_CONTABILIDAD ||
            empleado.rolId === Roles.GERENCIA ||
            empleado.rolId === Roles.RRHH
        );
        setSupervisores(supervisoresPermitidos);
      } catch (err) {
        console.error("Error al cargar supervisores:", err);
        showSnackbar("Error al cargar los supervisores", "error");
      } finally {
        setLoadingSupervisores(false);
      }
    },
    [showSnackbar]
  );

  // Cargar empleados por empresa para el diálogo
  const fetchEmpleadosDialog = React.useCallback(
    async (empresaId: string) => {
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
    },
    [showSnackbar]
  );

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
          const supervisorCompleto = await EmpleadoService.getById(
            acceso.supervisorId
          );
          supervisorEmpId = supervisorCompleto.empresaId;
        } catch (err) {
          console.error("Error al obtener supervisor completo:", err);
        }
      }

      if (!empleadoEmpId && acceso.empleadoId) {
        try {
          const empleadoCompleto = await EmpleadoService.getById(
            acceso.empleadoId
          );
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
        showSnackbar(
          errorMessage || "Error al crear el acceso de planilla",
          "error"
        );
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

  // Abrir diálogo de confirmación para eliminar
  const handleDeleteAcceso = (id: number) => {
    setConfirmDialog({
      open: true,
      accesoId: id,
    });
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!confirmDialog.accesoId) return;

    try {
      await PlanillaAccesoRevisionService.delete(confirmDialog.accesoId);
      showSnackbar("Acceso de planilla eliminado exitosamente", "success");
      fetchAccesos();
      setConfirmDialog({ open: false, accesoId: null });
    } catch (err: any) {
      console.error("Error al eliminar acceso:", err);
      showSnackbar(
        err.message || "Error al eliminar el acceso de planilla",
        "error"
      );
      setConfirmDialog({ open: false, accesoId: null });
    }
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, accesoId: null });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filtrar accesos por término de búsqueda
  const filteredAccesos = accesos.filter((acceso) => {
    if (!searchTerm) return true;

    const supervisorNombre = acceso.supervisor
      ? `${acceso.supervisor.nombre} ${
          acceso.supervisor.apellido || ""
        }`.toLowerCase()
      : "";
    const empleadoNombre = acceso.empleado
      ? `${acceso.empleado.nombre} ${
          acceso.empleado.apellido || ""
        }`.toLowerCase()
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
    const grupos = new Map<
      number,
      {
        supervisor: Empleado | undefined;
        supervisorId: number;
        accesos: PlanillaAccesoRevision[];
      }
    >();

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
        Accesos Especiales de Planilla
      </Typography>

      {/* Búsqueda y acción */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          mb: 3,
          gap: 2,
          alignItems: "center",
        }}
      >
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
              <TableCell>Empresa</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Fecha de Creación</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : accesosAgrupados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <SupervisorIcon color="primary" fontSize="medium" />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {grupo.supervisor
                              ? getEmpleadoNombre(grupo.supervisor)
                              : `ID: ${grupo.supervisorId}`}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {grupo.supervisor?.codigo && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {grupo.supervisor.codigo}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ({grupo.accesos.length} colaborador
                              {grupo.accesos.length !== 1 ? "es" : ""})
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="text.secondary"
                      >
                        {grupo.supervisor?.cargo || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="text.secondary"
                      >
                        {(() => {
                          const dept = grupo.supervisor?.departamento;
                          if (!dept || typeof dept === "string") return "-";
                          const empresaNombre = (dept as any)?.empresa?.nombre;
                          return empresaNombre || "-";
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="text.secondary"
                      >
                        {(() => {
                          const dept = grupo.supervisor?.departamento;
                          if (!dept) return "-";
                          if (typeof dept === "string") return dept;
                          return (dept as any)?.nombre || "-";
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {/* Sin fecha de creación para el supervisor */}
                    </TableCell>
                    <TableCell align="center">
                      {/* Sin acciones para el supervisor */}
                    </TableCell>
                  </TableRow>
                  {/* Filas de colaboradores supervisados */}
                  {grupo.accesos.map((acceso, accesoIndex) => (
                    <TableRow
                      key={acceso.id}
                      sx={{
                        backgroundColor:
                          accesoIndex % 2 === 0
                            ? "background.default"
                            : "action.hover",
                        "&:hover": {
                          backgroundColor: "action.selected",
                        },
                      }}
                    >
                      <TableCell>
                        {/* Colaborador supervisado con indentación para mostrar jerarquía */}
                        <Box
                          sx={{
                            pl: 3,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
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
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
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
                          {(() => {
                            const dept = acceso.empleado?.departamento;
                            if (!dept) return "-";
                            if (
                              typeof dept === "object" &&
                              (dept as any)?.empresa
                            ) {
                              return (dept as any).empresa.nombre || "-";
                            }
                            return "-";
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {(() => {
                            const dept = acceso.empleado?.departamento;
                            if (!dept) return "-";
                            if (typeof dept === "string") return dept;
                            return (dept as any)?.nombre || "-";
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(acceso.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
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
                      <TableCell
                        colSpan={6}
                        sx={{ height: 16, border: "none" }}
                      />
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
          {isEditing ? "Editar Acceso de Planilla" : "Crear Acceso de Planilla"}
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
                onChange={handleSelectChange}
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
                    {getEmpleadoNombre(empleado)}{" "}
                    {empleado.codigo && `(${empleado.codigo})`}
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
                onChange={handleSelectChange}
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
                      {getEmpleadoNombre(empleado)}{" "}
                      {empleado.codigo && `(${empleado.codigo})`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {formData.supervisorId === formData.empleadoId &&
              formData.supervisorId !== 0 && (
                <Alert severity="error">
                  El supervisor y el colaborador supervisado no pueden ser la
                  misma persona
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

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirmar eliminación"
        message="¿Está seguro que desea eliminar este acceso de planilla?"
        confirmText="Eliminar"
        cancelText="Conservar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

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
