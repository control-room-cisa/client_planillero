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
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
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
  const [formData, setFormData] = useState<CreateJobDto>({
    nombre: "",
    codigo: "",
    descripcion: "",
    empresaId: 0,
    mostrarEmpresaId: 0,
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

  // Cargar datos iniciales
  useEffect(() => {
    fetchJobs();
    fetchEmpresas();
  }, []);

  // Funciones para cargar datos
  const fetchJobs = async () => {
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
  };

  const fetchEmpresas = async () => {
    try {
      const response = await empresaService.getEmpresas();
      if (response.success) {
        setEmpresas(response.data);
      }
    } catch (err) {
      console.error("Error al cargar empresas:", err);
      showSnackbar("Error al cargar las empresas", "error");
    }
  };

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

  const handleMostrarEmpresaChange = (e: SelectChangeEvent) => {
    setFormData({
      ...formData,
      mostrarEmpresaId: Number(e.target.value),
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      empresaId: 0,
      mostrarEmpresaId: 0,
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
      await JobService.create(formData);
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
      await JobService.update(currentJob.id, formData as UpdateJobDto);
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

  // Función para mostrar notificaciones
  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filtrar jobs por término de búsqueda
  const filteredJobs = jobs.filter(
    (job) =>
      job.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Jobs
      </Typography>

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
              <TableCell>Empresa Mostrar</TableCell>
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
            ) : filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay jobs disponibles
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.codigo}</TableCell>
                  <TableCell>{job.nombre}</TableCell>
                  <TableCell>{job.descripcion}</TableCell>
                  <TableCell>{job.empresa?.nombre || '-'}</TableCell>
                  <TableCell>
                    {empresas.find(e => e.id === job.mostrarEmpresaId)?.nombre || '-'}
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
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id.toString()}>
                    {empresa.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Empresa a Mostrar</InputLabel>
              <Select
                value={formData.mostrarEmpresaId === 0 ? "" : formData.mostrarEmpresaId.toString()}
                onChange={handleMostrarEmpresaChange}
                label="Empresa a Mostrar"
                required
              >
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
            disabled={!formData.nombre || !formData.codigo || formData.empresaId === 0 || formData.mostrarEmpresaId === 0}
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