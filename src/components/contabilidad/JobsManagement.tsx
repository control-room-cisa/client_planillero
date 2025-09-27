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

  // Funciones para el manejo del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
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
    } catch (err) {
      console.error("Error al crear job:", err);
      showSnackbar("Error al crear el job", "error");
    }
  };

  const handleUpdateJob = async () => {
    if (!currentJob) return;

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
    } catch (err) {
      console.error("Error al actualizar job:", err);
      showSnackbar("Error al actualizar el job", "error");
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

  const groupedJobsArray = Object.values(groupedJobs);

  // Verificar si hay una empresa seleccionada para habilitar el botón de agregar
  const isAddButtonDisabled = selectedEmpresaId === "";

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Jobs
      </Typography>

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
                {empresas.map((empresa) => (
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
                  {grupo.jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{job.codigo}</TableCell>
                      <TableCell>{job.nombre}</TableCell>
                      <TableCell>{job.descripcion}</TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={job.activo}
                          onChange={() =>
                            handleToggleActive(job.id, job.activo)
                          }
                          color="primary"
                          disabled={job.especial}
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
                        >
                          <EditIcon />
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
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
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
              >
                <MenuItem value="">Seleccione una empresa</MenuItem>
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id.toString()}>
                    {empresa.nombre}
                  </MenuItem>
                ))}
              </Select>
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
              formData.empresaId === undefined
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
