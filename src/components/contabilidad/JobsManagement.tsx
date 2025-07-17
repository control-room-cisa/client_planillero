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
import type { Job, CreateJobDto, UpdateJobDto } from "../../services/jobService";
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
  const showSnackbar = React.useCallback((message: string, severity: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }, []);

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
    try {
      // console.log(`Intentando cambiar estado de job ${id} de ${currentStatus} a ${!currentStatus}`);
      // // Usar update en lugar de toggleActive
      // const updatedJob = await JobService.update(id, { activo: !currentStatus });
      // console.log('Job actualizado:', updatedJob);
      
      // Actualizar el estado local de forma más segura
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === id ? { ...job, activo: !currentStatus } : job
        )
      );
      
      showSnackbar(`Job ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`, "success");
    } catch (err) {
      console.error("Error al cambiar estado del job:", err);
      showSnackbar("Error al cambiar estado del job", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      empresaId: 0,
      mostrarEmpresaId: selectedEmpresaId !== "" ? Number(selectedEmpresaId) : 0,
      activo: true,
    });
    setCurrentJob(null);
    setIsEditing(false);
  };

  const handleOpenDialog = (job?: Job) => {
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
        mostrarEmpresaId: selectedEmpresaId !== "" ? Number(selectedEmpresaId) : formData.mostrarEmpresaId
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
        mostrarEmpresaId: selectedEmpresaId !== "" ? Number(selectedEmpresaId) : formData.mostrarEmpresaId
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
  const filteredJobs = jobs.filter(
    (job) => {
      // Filtro por término de búsqueda
      const matchesSearchTerm = 
        job.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por empresa seleccionada - solo mostrar jobs si hay una empresa seleccionada
      const matchesEmpresa = selectedEmpresaId === "" || job.mostrarEmpresaId === Number(selectedEmpresaId);
      
      return matchesSearchTerm && matchesEmpresa;
    }
  );

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
            startAdornment: <SearchIcon sx={{ color: "action.active", mr: 1 }} />,
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

      {/* Tabla de Jobs */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell align="center">Activo</TableCell>
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
            ) : selectedEmpresaId === "" ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Seleccione una empresa para ver los jobs
                </TableCell>
              </TableRow>
            ) : filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay jobs disponibles para esta empresa
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.codigo}</TableCell>
                  <TableCell>{job.nombre}</TableCell>
                  <TableCell>{job.descripcion}</TableCell>
                  <TableCell>{job.empresa?.nombre || '-'}</TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={job.activo}
                      onChange={() => handleToggleActive(job.id, job.activo)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(job)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteJob(job.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para crear/editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
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
                value={formData.empresaId === 0 ? "" : formData.empresaId.toString()}
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
            disabled={!formData.nombre || !formData.codigo || formData.empresaId === 0}
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