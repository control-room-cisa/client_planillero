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
  Chip,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import * as React from "react";

import FeriadoService from "../../services/feriadoService";
import type { Feriado, CreateFeriadoDto } from "../../services/feriadoService";

/** Helper: interpreta "YYYY-MM-DD" como medianoche LOCAL (evita el -1 día por UTC) */
const parseLocalDate = (s: string): Date => {
  if (!s) return new Date(NaN);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const [, y, mm, d] = m;
    return new Date(Number(y), Number(mm) - 1, Number(d));
  }
  return new Date(s); // fallback si viene con hora/ISO completa
};

/** Devuelve true si la fecha (solo día) ya pasó respecto a hoy local (00:00) */
const isPastDate = (dateString: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseLocalDate(dateString);
  return d.getTime() < today.getTime();
};

/** Color del chip según pasado/próximo */
const getDateChipColor = (dateString: string) =>
  isPastDate(dateString) ? "default" : "primary";

const FeriadosManagement: React.FC = () => {
  // Estados
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFeriado, setCurrentFeriado] = useState<Feriado | null>(null);
  const [formData, setFormData] = useState<CreateFeriadoDto>({
    fecha: "",
    nombre: "",
    descripcion: "",
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
  const fetchFeriados = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await FeriadoService.getAll();
      // Ordenar por fecha (más recientes primero) usando fecha LOCAL
      const sortedData = data.sort(
        (a, b) =>
          parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime()
      );
      setFeriados(sortedData);
    } catch (err) {
      console.error("Error al cargar feriados:", err);
      showSnackbar("Error al cargar los feriados", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchFeriados();
  }, [fetchFeriados]);

  // Funciones para el manejo del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const resetForm = () => {
    setFormData({
      fecha: "",
      nombre: "",
      descripcion: "",
    });
    setCurrentFeriado(null);
    setIsEditing(false);
  };

  const handleOpenDialog = (feriado?: Feriado) => {
    if (feriado) {
      setIsEditing(true);
      setCurrentFeriado(feriado);
      setFormData({
        fecha: feriado.fecha, // mantiene "YYYY-MM-DD"
        nombre: feriado.nombre,
        descripcion: feriado.descripcion || "",
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
  const handleCreateFeriado = async () => {
    try {
      await FeriadoService.create(formData);
      showSnackbar("Feriado creado exitosamente", "success");
      handleCloseDialog();
      fetchFeriados();
    } catch (err) {
      console.error("Error al crear feriado:", err);
      showSnackbar("Error al crear el feriado", "error");
    }
  };

  const handleUpdateFeriado = async () => {
    if (!currentFeriado) return;

    try {
      await FeriadoService.upsert(currentFeriado.fecha, formData);
      showSnackbar("Feriado actualizado exitosamente", "success");
      handleCloseDialog();
      fetchFeriados();
    } catch (err) {
      console.error("Error al actualizar feriado:", err);
      showSnackbar("Error al actualizar el feriado", "error");
    }
  };

  const handleDeleteFeriado = async (id: number) => {
    if (window.confirm("¿Está seguro que desea eliminar este feriado?")) {
      try {
        await FeriadoService.delete(id);
        showSnackbar("Feriado eliminado exitosamente", "success");
        fetchFeriados();
      } catch (err) {
        console.error("Error al eliminar feriado:", err);
        showSnackbar("Error al eliminar el feriado", "error");
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filtrar feriados por término de búsqueda
  const filteredFeriados = feriados.filter((feriado) => {
    const matchesSearchTerm =
      feriado.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feriado.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feriado.fecha.includes(searchTerm);

    return matchesSearchTerm;
  });

  // Función para formatear fecha (usa fecha local)
  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Días Festivos
      </Typography>

      {/* Barra de búsqueda y botón de agregar */}
      <Box sx={{ display: "flex", mb: 3, gap: 2 }}>
        <TextField
          label="Buscar por nombre, descripción o fecha"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
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
          Nuevo Feriado
        </Button>
      </Box>

      {/* Tabla de Feriados */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
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
            ) : filteredFeriados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay feriados registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredFeriados.map((feriado) => (
                <TableRow key={feriado.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <EventIcon color="action" fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDate(feriado.fecha)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {feriado.fecha}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {feriado.nombre}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {feriado.descripcion || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isPastDate(feriado.fecha) ? "Pasado" : "Próximo"}
                      color={getDateChipColor(feriado.fecha)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(feriado)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteFeriado(feriado.id)}
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
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Editar Feriado" : "Crear Nuevo Feriado"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Fecha"
              name="fecha"
              type="date"
              value={formData.fecha}
              onChange={handleInputChange}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Nombre del Feriado"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="Ej: Día de la Independencia"
            />
            <TextField
              label="Descripción (opcional)"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Descripción adicional del feriado..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={isEditing ? handleUpdateFeriado : handleCreateFeriado}
            variant="contained"
            color="primary"
            disabled={!formData.nombre || !formData.fecha}
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

export default FeriadosManagement;
