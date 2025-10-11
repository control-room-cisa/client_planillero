import React, { useState, useEffect } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterAlt as FilterIcon,
} from "@mui/icons-material";
import JobService from "../../services/jobService";
import type {
  Job,
  CreateJobDto,
  UpdateJobDto,
} from "../../services/jobService";
import { empresaService } from "../../services/empresaService";
import type { Empresa } from "../../types/auth";

const JobsManagement: React.FC = () => {
  // Estados
  const [jobs, setJobs] = useState<Job[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [formData, setFormData] = useState<CreateJobDto>({
    nombre: "",
    codigo: "",
    descripcion: "",
    empresaId: 0,
    mostrarEmpresaId: 0,
    activo: true,
  });
  const [codigoError, setCodigoError] = useState<string>("");
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
  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await JobService.getAll();
      setJobs(data);
    } catch (err) {
      console.error("Error al cargar jobs:", err);
      showSnackbar("Error al cargar los jobs", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchEmpresas = React.useCallback(async () => {
    try {
      const response = await empresaService.getEmpresas();
      if (response.success) {
        setEmpresas(response.data);
      }
    } catch (err) {
      console.error("Error al cargar empresas:", err);
      showSnackbar("Error al cargar las empresas", "error");
    }
  }, [showSnackbar]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchJobs();
    fetchEmpresas();
  }, [fetchJobs, fetchEmpresas]);

  // Función para validar la estructura jerárquica del código
  const validateCodigoJerarquico = (
    codigo: string
  ): { isValid: boolean; error: string } => {
    if (!codigo.trim()) {
      return { isValid: false, error: "El código es obligatorio" };
    }

    // Validar formato: NNNN.NNNN.NNNN (máximo 4 dígitos por número, máximo 2 puntos)
    const codigoPattern = /^(\d{1,4})(\.\d{1,4})?(\.\d{1,4})?$/;
    if (!codigoPattern.test(codigo)) {
      return {
        isValid: false,
        error:
          "El código debe seguir el formato: NNNN.NNNN.NNNN (máximo 4 dígitos por número, máximo 2 puntos)",
      };
    }

    // Verificar que no exceda 3 niveles
    const partes = codigo.split(".");
    if (partes.length > 3) {
      return {
        isValid: false,
        error: "El código no puede tener más de 3 niveles",
      };
    }

    // Obtener la empresaMostrar actual
    const empresaMostrarId =
      selectedEmpresaId !== ""
        ? Number(selectedEmpresaId)
        : formData.mostrarEmpresaId;

    // Filtrar jobs solo del grupo mostrarEmpresa actual
    const jobsDelGrupo = jobs.filter(
      (job) => job.mostrarEmpresaId === empresaMostrarId
    );

    // Validar que el job antecesor exista en el mismo grupo
    if (partes.length > 1) {
      const codigoAntecesor = partes.slice(0, -1).join(".");
      const jobAntecesor = jobsDelGrupo.find(
        (job) => job.codigo === codigoAntecesor
      );

      if (!jobAntecesor) {
        return {
          isValid: false,
          error: `El job antecesor "${codigoAntecesor}" no existe en este grupo`,
        };
      }
    }

    // Validar que no exista un job con el mismo código en el mismo grupo (excepto al editar)
    const jobExistente = jobsDelGrupo.find((job) => job.codigo === codigo);
    if (jobExistente && (!isEditing || jobExistente.id !== currentJob?.id)) {
      return {
        isValid: false,
        error: "Ya existe un job con este código en este grupo",
      };
    }

    return { isValid: true, error: "" };
  };

  // Funciones para el manejo del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Si es el campo código, solo permitir números y puntos con límites
    if (name === "codigo") {
      // Filtrar solo números y puntos
      let filteredValue = value.replace(/[^0-9.]/g, "");

      // Aplicar límites de formato NNNN.NNNN.NNNN
      const partes = filteredValue.split(".");
      if (partes.length > 3) {
        // Si hay más de 2 puntos, truncar
        filteredValue = partes.slice(0, 3).join(".");
      }

      // Limitar cada parte a máximo 4 dígitos
      const partesLimitadas = partes
        .slice(0, 3)
        .map((parte) => (parte.length > 4 ? parte.substring(0, 4) : parte));
      filteredValue = partesLimitadas.join(".");

      setFormData({
        ...formData,
        [name]: filteredValue,
      });

      // Validar código
      const validation = validateCodigoJerarquico(filteredValue);
      setCodigoError(validation.error);

      // Si es un job hijo y existe el antecesor, seleccionar automáticamente la empresa
      if (
        filteredValue.includes(".") &&
        !validation.error.includes("no existe")
      ) {
        const partes = filteredValue.split(".");
        if (partes.length > 1) {
          const codigoAntecesor = partes.slice(0, -1).join(".");

          // Obtener la empresaMostrar actual para filtrar jobs del grupo
          const empresaMostrarId =
            selectedEmpresaId !== ""
              ? Number(selectedEmpresaId)
              : formData.mostrarEmpresaId;

          // Buscar solo en jobs del grupo actual
          const jobsDelGrupo = jobs.filter(
            (job) => job.mostrarEmpresaId === empresaMostrarId
          );
          const jobAntecesor = jobsDelGrupo.find(
            (job) => job.codigo === codigoAntecesor
          );

          if (jobAntecesor && jobAntecesor.empresaId) {
            // Seleccionar automáticamente la empresa del antecesor (solo empresa, no mostrarEmpresa)
            setFormData((prev) => ({
              ...prev,
              empresaId: jobAntecesor.empresaId,
            }));
          }
        }
      }
    } else {
      // Para otros campos, comportamiento normal
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleEmpresaChange = (e: SelectChangeEvent) => {
    setFormData({
      ...formData,
      empresaId: Number(e.target.value),
    });
  };

  const handleEmpresaFilterChange = (e: SelectChangeEvent) => {
    setSelectedEmpresaId(e.target.value);
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    // Verificar si el job es especial
    const job = jobs.find((j) => j.id === id);
    if (job?.especial) {
      showSnackbar("No se puede modificar un job especial", "error");
      return;
    }

    try {
      // Optimistic update: actualizar el estado local inmediatamente
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === id ? { ...job, activo: !currentStatus } : job
        )
      );

      // Llamar a la API para actualizar el estado en el servidor
      await JobService.update(id, { activo: !currentStatus });

      showSnackbar(
        `Job ${!currentStatus ? "activado" : "desactivado"} exitosamente`,
        "success"
      );
    } catch (err) {
      console.error("Error al cambiar estado del job:", err);

      // Revertir el cambio optimista en caso de error
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === id ? { ...job, activo: currentStatus } : job
        )
      );

      showSnackbar("Error al cambiar estado del job", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      empresaId: 0,
      mostrarEmpresaId:
        selectedEmpresaId !== "" ? Number(selectedEmpresaId) : 0,
      activo: true,
    });
    setCurrentJob(null);
    setIsEditing(false);
    setCodigoError("");
  };

  const handleOpenDialog = (job?: Job) => {
    // Verificar si el job es especial
    if (job?.especial) {
      showSnackbar("No se puede editar un job especial", "error");
      return;
    }

    if (job) {
      setIsEditing(true);
      setCurrentJob(job);
      setFormData({
        nombre: job.nombre || "",
        codigo: job.codigo || "",
        descripcion: job.descripcion || "",
        empresaId: job.empresaId,
        mostrarEmpresaId: job.mostrarEmpresaId,
        activo: job.activo,
      });
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
  const handleCreateJob = async () => {
    // Validar código antes de crear (validación básica del frontend)
    const validation = validateCodigoJerarquico(formData.codigo);
    if (!validation.isValid) {
      setCodigoError(validation.error);
      showSnackbar(validation.error, "error");
      return;
    }

    try {
      // Asegurarse de que mostrarEmpresaId sea el valor del filtro seleccionado
      const dataToSend = {
        ...formData,
        mostrarEmpresaId:
          selectedEmpresaId !== ""
            ? Number(selectedEmpresaId)
            : formData.mostrarEmpresaId,
      };

      await JobService.create(dataToSend);
      showSnackbar("Job creado exitosamente", "success");
      handleCloseDialog();
      fetchJobs();
    } catch (err: any) {
      console.error("Error al crear job:", err);

      // Mostrar el mensaje de error del backend si está disponible
      const errorMessage = err.message || "Error al crear el job";
      showSnackbar(errorMessage, "error");

      // Si es un error de validación del backend, mostrarlo también en el campo
      if (
        (err.message && err.message.includes("antecesor")) ||
        err.message.includes("código")
      ) {
        setCodigoError(err.message);
      }
    }
  };

  const handleUpdateJob = async () => {
    if (!currentJob) return;

    // Validar código antes de actualizar (validación básica del frontend)
    const validation = validateCodigoJerarquico(formData.codigo);
    if (!validation.isValid) {
      setCodigoError(validation.error);
      showSnackbar(validation.error, "error");
      return;
    }

    try {
      // Asegurarse de que mostrarEmpresaId sea el valor del filtro seleccionado
      const dataToSend = {
        ...formData,
        mostrarEmpresaId:
          selectedEmpresaId !== ""
            ? Number(selectedEmpresaId)
            : formData.mostrarEmpresaId,
      };

      await JobService.update(currentJob.id, dataToSend as UpdateJobDto);
      showSnackbar("Job actualizado exitosamente", "success");
      handleCloseDialog();
      fetchJobs();
    } catch (err: any) {
      console.error("Error al actualizar job:", err);

      // Mostrar el mensaje de error del backend si está disponible
      const errorMessage = err.message || "Error al actualizar el job";
      showSnackbar(errorMessage, "error");

      // Si es un error de validación del backend, mostrarlo también en el campo
      if (
        err.message &&
        (err.message.includes("antecesor") || err.message.includes("código"))
      ) {
        setCodigoError(err.message);
      }
    }
  };

  const handleDeleteJob = async (id: number) => {
    // Verificar si el job es especial
    const job = jobs.find((j) => j.id === id);
    if (job?.especial) {
      showSnackbar("No se puede eliminar un job especial", "error");
      return;
    }

    if (window.confirm("¿Está seguro que desea eliminar este job?")) {
      try {
        await JobService.delete(id);
        showSnackbar("Job eliminado exitosamente", "success");
        fetchJobs();
      } catch (err) {
        console.error("Error al eliminar job:", err);
        showSnackbar("Error al eliminar el job", "error");
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filtrar jobs por término de búsqueda y empresa seleccionada
  const filteredJobs = jobs.filter((job) => {
    // Filtro por término de búsqueda
    const matchesSearchTerm =
      job.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por empresa seleccionada - usar mostrarEmpresaId como estaba originalmente
    const matchesEmpresa =
      selectedEmpresaId === "" ||
      job.mostrarEmpresaId === Number(selectedEmpresaId);

    return matchesSearchTerm && matchesEmpresa;
  });

  // Función para determinar el nivel jerárquico de un job
  const getJobLevel = (codigo: string): number => {
    return codigo.split(".").length - 1;
  };

  // Función para ordenar jobs jerárquicamente
  const sortJobsHierarchically = (jobs: Job[]): Job[] => {
    // Crear una estructura de árbol y luego aplanarla
    const result: Job[] = [];
    const jobsMap = new Map<string, Job>();

    // Crear un mapa de todos los jobs por código
    jobs.forEach((job) => {
      jobsMap.set(job.codigo, job);
    });

    // Función recursiva para agregar un job y sus hijos
    const addJobAndChildren = (codigo: string) => {
      const job = jobsMap.get(codigo);
      if (!job) return;

      result.push(job);

      // Buscar todos los hijos directos de este job
      const children: Job[] = [];
      jobsMap.forEach((childJob) => {
        const parts = childJob.codigo.split(".");
        // Es hijo directo si tiene un nivel más y su prefijo coincide
        if (
          parts.length === codigo.split(".").length + 1 &&
          childJob.codigo.startsWith(codigo + ".")
        ) {
          children.push(childJob);
        }
      });

      // Ordenar hijos por código numérico
      children.sort((a, b) =>
        a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
      );

      // Agregar cada hijo y sus descendientes recursivamente
      children.forEach((child) => {
        addJobAndChildren(child.codigo);
      });
    };

    // Primero, encontrar todos los jobs de nivel 0 (sin puntos)
    const rootJobs = jobs
      .filter((job) => !job.codigo.includes("."))
      .sort((a, b) =>
        a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
      );

    // Agregar cada job raíz y sus descendientes
    rootJobs.forEach((rootJob) => {
      addJobAndChildren(rootJob.codigo);
    });

    return result;
  };

  // Agrupar jobs por empresa y especiales
  const groupedJobs = filteredJobs.reduce((acc, job) => {
    if (job.especial) {
      // Agrupar jobs especiales
      if (!acc["especiales"]) {
        acc["especiales"] = {
          empresaId: "especiales",
          empresaNombre: "ESPECIALES",
          jobs: [],
        };
      }
      acc["especiales"].jobs.push(job);
    } else {
      // Agrupar jobs normales por empresa
      const empresaId = job.empresaId || 0;
      const empresaNombre = job.empresa?.nombre || "Sin empresa";

      if (!acc[empresaId]) {
        acc[empresaId] = {
          empresaId,
          empresaNombre,
          jobs: [],
        };
      }

      acc[empresaId].jobs.push(job);
    }
    return acc;
  }, {} as Record<string | number, { empresaId: string | number; empresaNombre: string; jobs: Job[] }>);

  // Ordenar jobs jerárquicamente en cada grupo
  Object.values(groupedJobs).forEach((grupo) => {
    grupo.jobs = sortJobsHierarchically(grupo.jobs);
  });

  const groupedJobsArray = Object.values(groupedJobs);

  // Verificar si hay una empresa seleccionada para habilitar el botón de agregar
  const isAddButtonDisabled = selectedEmpresaId === "";

  return (
    <Box sx={{ p: 5 }}>
      <Typography variant="h5" component="h2">
        Gestión de Jobs
      </Typography>

      {/* Leyenda de jerarquía */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "grey.50",
          borderRadius: 1,
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Typography
          variant="subtitle2"
          gutterBottom
          sx={{ fontWeight: "bold" }}
        >
          Jerarquía de Jobs:
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "primary.main",
              }}
            />
            <Typography variant="body2">Nivel 1</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "6px solid",
                borderTopColor: "primary.main",
              }}
            />
            <Typography variant="body2">Nivel 2</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 0,
                height: 0,
                borderLeft: "3px solid transparent",
                borderRight: "3px solid transparent",
                borderTop: "5px solid",
                borderTopColor: "secondary.main",
              }}
            />
            <Typography variant="body2">Nivel 3</Typography>
          </Box>
        </Box>
      </Box>

      {/* Filtro de empresas */}
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <FilterIcon color="primary" />
            <Typography variant="subtitle1">Seleccionar Empresa:</Typography>
            <FormControl sx={{ minWidth: 250 }}>
              <Select
                value={selectedEmpresaId}
                onChange={handleEmpresaFilterChange}
                displayEmpty
                size="small"
              >
                <MenuItem value="">Seleccione una empresa</MenuItem>
                {empresas
                  .filter((empresa) => empresa.esConsorcio === true)
                  .map((empresa) => (
                    <MenuItem key={empresa.id} value={empresa.id.toString()}>
                      {empresa.nombre}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      </Box>

      {/* Barra de búsqueda y botón de agregar */}
      <Box sx={{ display: "flex", mb: 3, gap: 2 }}>
        <TextField
          label="Buscar"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: "action.active", mr: 1 }} />
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={isAddButtonDisabled}
        >
          Nuevo Job
        </Button>
      </Box>

      {/* Tabla de Jobs Agrupados por Empresa */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="center">Activo</TableCell>
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
            ) : selectedEmpresaId === "" ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Seleccione una empresa para ver los jobs
                </TableCell>
              </TableRow>
            ) : groupedJobsArray.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay jobs disponibles para esta empresa
                </TableCell>
              </TableRow>
            ) : (
              groupedJobsArray.map((grupo) => (
                <React.Fragment key={grupo.empresaId}>
                  {/* Fila de encabezado de empresa */}
                  <TableRow sx={{ backgroundColor: "grey.100" }}>
                    <TableCell colSpan={5}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color:
                            grupo.empresaId === "especiales"
                              ? "error.main"
                              : "primary.main",
                        }}
                      >
                        {grupo.empresaNombre}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {/* Jobs de la empresa */}
                  {grupo.jobs.map((job) => {
                    const level = getJobLevel(job.codigo);
                    const isChild = level > 0;

                    return (
                      <TableRow
                        key={job.id}
                        sx={{
                          backgroundColor: isChild
                            ? "rgba(0, 0, 0, 0.02)"
                            : "inherit",
                          "&:hover": {
                            backgroundColor: isChild
                              ? "rgba(0, 0, 0, 0.04)"
                              : "rgba(0, 0, 0, 0.04)",
                          },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {/* Indentación visual para mostrar jerarquía */}
                            <Box
                              sx={{
                                width: level * 24,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {isChild && (
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 1,
                                    backgroundColor: "grey.400",
                                    mr: 1,
                                  }}
                                />
                              )}
                            </Box>

                            {/* Icono de jerarquía */}
                            <Box
                              sx={{
                                mr: 1,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {level === 0 && (
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: "primary.main",
                                  }}
                                />
                              )}
                              {level === 1 && (
                                <Box
                                  sx={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: "4px solid transparent",
                                    borderRight: "4px solid transparent",
                                    borderTop: "6px solid",
                                    borderTopColor: "primary.main",
                                  }}
                                />
                              )}
                              {level === 2 && (
                                <Box
                                  sx={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: "3px solid transparent",
                                    borderRight: "3px solid transparent",
                                    borderTop: "5px solid",
                                    borderTopColor: "secondary.main",
                                  }}
                                />
                              )}
                            </Box>

                            {/* Código del job */}
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: level === 0 ? "bold" : "normal",
                                color:
                                  level === 0 ? "primary.main" : "text.primary",
                                fontFamily: "monospace",
                              }}
                            >
                              {job.codigo}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: level === 0 ? "bold" : "normal",
                              color:
                                level === 0 ? "primary.main" : "text.primary",
                            }}
                          >
                            {job.nombre}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: isChild
                                ? "text.secondary"
                                : "text.primary",
                              fontStyle: isChild ? "italic" : "normal",
                            }}
                          >
                            {job.descripcion}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={job.activo}
                            onChange={() =>
                              handleToggleActive(job.id, job.activo)
                            }
                            color="primary"
                            disabled={job.especial}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(job)}
                            disabled={job.especial}
                            title={
                              job.especial
                                ? "No se puede editar un job especial"
                                : "Editar"
                            }
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteJob(job.id)}
                            disabled={job.especial}
                            title={
                              job.especial
                                ? "No se puede eliminar un job especial"
                                : "Eliminar"
                            }
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
          {isEditing ? "Editar Job" : "Crear Nuevo Job"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Código"
              name="codigo"
              value={formData.codigo}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!codigoError}
              helperText={
                codigoError ||
                "Formato: NNNN.NNNN.NNNN (máximo 4 dígitos por número, máximo 2 puntos)"
              }
              placeholder="Ej: 100, 100.1, 100.1.5"
            />
            <TextField
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Descripción"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Empresa</InputLabel>
              <Select
                value={
                  formData.empresaId === 0 ||
                  formData.empresaId === null ||
                  formData.empresaId === undefined
                    ? ""
                    : formData.empresaId.toString()
                }
                onChange={handleEmpresaChange}
                label="Empresa"
                required
                disabled={formData.codigo.includes(".")}
              >
                <MenuItem value="">Seleccione una empresa</MenuItem>
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id.toString()}>
                    {empresa.nombre}
                  </MenuItem>
                ))}
              </Select>
              {formData.codigo.includes(".") && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, fontSize: "0.75rem" }}
                >
                  La empresa se selecciona automáticamente para jobs jerárquicos
                </Typography>
              )}
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={isEditing ? handleUpdateJob : handleCreateJob}
            variant="contained"
            color="primary"
            disabled={
              !formData.nombre ||
              !formData.codigo ||
              formData.empresaId === 0 ||
              formData.empresaId === null ||
              formData.empresaId === undefined ||
              !!codigoError
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

export default JobsManagement;
