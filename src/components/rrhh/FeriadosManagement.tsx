import { useState, useEffect, useMemo } from "react";
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
  TablePagination,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  InputAdornment,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
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
import ModuleTitle from "../common/ModuleTitle";
import type {
  Feriado,
  CreateFeriadoDto,
  TipoFeriado,
} from "../../services/feriadoService";
import ConfirmDialog from "../common/ConfirmDialog";

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

const TIPO_FERIADO_LABEL: Record<TipoFeriado, string> = {
  TODO_EL_DIA: "Todo el día",
  DESDE: "Desde",
  HASTA: "Hasta",
};

const emptyFormData = (): CreateFeriadoDto => ({
  fecha: "",
  nombre: "",
  descripcion: "",
  tipo: "TODO_EL_DIA",
  horaDesde: null,
  horaHasta: null,
});

const formatAlcance = (feriado: Feriado) => {
  if (feriado.tipo === "DESDE" && feriado.horaDesde) {
    return `Desde ${feriado.horaDesde}`;
  }
  if (feriado.tipo === "HASTA" && feriado.horaHasta) {
    return `Hasta ${feriado.horaHasta}`;
  }
  return TIPO_FERIADO_LABEL.TODO_EL_DIA;
};

const ROWS_PER_PAGE = 15;

const compareFeriadoFechaDesc = (a: Feriado, b: Feriado) =>
  parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime();

const FeriadosManagement: React.FC = () => {
  // Estados
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFeriado, setCurrentFeriado] = useState<Feriado | null>(null);
  const [formData, setFormData] = useState<CreateFeriadoDto>(emptyFormData());
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
    feriadoId: number | null;
  }>({
    open: false,
    feriadoId: null,
  });

  const [page, setPage] = useState(0);

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
      setFeriados(data);
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

  const handleTipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tipo = e.target.value as TipoFeriado;
    setFormData({
      ...formData,
      tipo,
      horaDesde: tipo === "DESDE" ? formData.horaDesde || "" : null,
      horaHasta: tipo === "HASTA" ? formData.horaHasta || "" : null,
    });
  };

  const resetForm = () => {
    setFormData(emptyFormData());
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
        tipo: feriado.tipo || "TODO_EL_DIA",
        horaDesde: feriado.horaDesde || null,
        horaHasta: feriado.horaHasta || null,
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

  const buildPayload = (): CreateFeriadoDto => {
    if (formData.tipo === "TODO_EL_DIA") {
      return { ...formData, horaDesde: null, horaHasta: null };
    }
    if (formData.tipo === "DESDE") {
      return { ...formData, horaHasta: null };
    }
    return { ...formData, horaDesde: null };
  };

  // Funciones CRUD
  const handleCreateFeriado = async () => {
    if (existeOtroFeriadoEnFecha(formData.fecha)) {
      showSnackbar(
        "Ya existe un feriado con esa fecha. No se permiten duplicados.",
        "error"
      );
      return;
    }
    try {
      await FeriadoService.create(buildPayload());
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

    if (existeOtroFeriadoEnFecha(formData.fecha, currentFeriado.id)) {
      showSnackbar(
        "Ya existe otro feriado con esa fecha. No se permiten duplicados.",
        "error"
      );
      return;
    }

    try {
      const payload = buildPayload();
      // Si la fecha cambió, necesitamos eliminar el registro viejo y crear uno nuevo
      const fechaCambio = currentFeriado.fecha !== formData.fecha;

      if (fechaCambio) {
        // Primero eliminar el registro viejo
        await FeriadoService.delete(currentFeriado.id);
        // Luego crear uno nuevo con la nueva fecha
        await FeriadoService.create(payload);
        showSnackbar(
          "Feriado actualizado exitosamente (fecha modificada)",
          "success"
        );
      } else {
        // Si la fecha no cambió, hacer upsert normal
        await FeriadoService.upsert(currentFeriado.fecha, payload);
        showSnackbar("Feriado actualizado exitosamente", "success");
      }

      handleCloseDialog();
      fetchFeriados();
    } catch (err) {
      console.error("Error al actualizar feriado:", err);
      showSnackbar("Error al actualizar el feriado", "error");
    }
  };

  // Abrir diálogo de confirmación para eliminar
  const handleDeleteFeriado = (id: number) => {
    setConfirmDialog({
      open: true,
      feriadoId: id,
    });
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!confirmDialog.feriadoId) return;

    try {
      await FeriadoService.delete(confirmDialog.feriadoId);
      showSnackbar("Feriado eliminado exitosamente", "success");
      fetchFeriados();
      setConfirmDialog({ open: false, feriadoId: null });
    } catch (err) {
      console.error("Error al eliminar feriado:", err);
      showSnackbar("Error al eliminar el feriado", "error");
      setConfirmDialog({ open: false, feriadoId: null });
    }
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, feriadoId: null });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /** Siempre por fecha del festivo (más futura / reciente primero), no por creación. */
  const feriadosOrdenados = useMemo(
    () => [...feriados].sort(compareFeriadoFechaDesc),
    [feriados]
  );

  const filteredFeriados = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return feriadosOrdenados;
    return feriadosOrdenados.filter((feriado) => {
      return (
        feriado.nombre?.toLowerCase().includes(q) ||
        feriado.descripcion?.toLowerCase().includes(q) ||
        feriado.fecha.includes(searchTerm.trim()) ||
        formatAlcance(feriado).toLowerCase().includes(q)
      );
    });
  }, [feriadosOrdenados, searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filteredFeriados.length / ROWS_PER_PAGE) - 1
    );
    if (page > maxPage) setPage(maxPage);
  }, [filteredFeriados.length, page]);

  const paginatedFeriados = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return filteredFeriados.slice(start, start + ROWS_PER_PAGE);
  }, [filteredFeriados, page]);

  const existeOtroFeriadoEnFecha = (
    fecha: string,
    excludeId?: number | null
  ) =>
    feriados.some(
      (f) => f.fecha === fecha && (excludeId == null || f.id !== excludeId)
    );

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

  const isFormValid =
    !!formData.nombre &&
    !!formData.fecha &&
    (formData.tipo === "TODO_EL_DIA" ||
      (formData.tipo === "DESDE" && !!formData.horaDesde) ||
      (formData.tipo === "HASTA" && !!formData.horaHasta));

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
      <ModuleTitle>Gestión de Días Festivos</ModuleTitle>

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

      {/* Tabla de Feriados con scroll interno */}
      <TableContainer component={Paper} sx={{ flex: 1, minHeight: 0 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Alcance</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
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
            ) : filteredFeriados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay feriados registrados
                </TableCell>
              </TableRow>
            ) : (
              paginatedFeriados.map((feriado) => (
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
                    <Chip
                      label={formatAlcance(feriado)}
                      size="small"
                      variant={
                        feriado.tipo === "TODO_EL_DIA" ? "outlined" : "filled"
                      }
                      color={
                        feriado.tipo === "TODO_EL_DIA" ? "default" : "secondary"
                      }
                    />
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
        <TablePagination
          component="div"
          count={filteredFeriados.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count !== -1 ? count : to}`
          }
        />
      </TableContainer>

      {/* Diálogo para crear/editar */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Editar Feriado" : "Crear Feriado"}
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
            <FormControl>
              <FormLabel id="tipo-feriado-label">Alcance del feriado</FormLabel>
              <RadioGroup
                row
                aria-labelledby="tipo-feriado-label"
                name="tipo"
                value={formData.tipo}
                onChange={handleTipoChange}
              >
                <FormControlLabel
                  value="TODO_EL_DIA"
                  control={<Radio />}
                  label="Todo el día"
                />
                <FormControlLabel
                  value="DESDE"
                  control={<Radio />}
                  label="Desde"
                />
                <FormControlLabel
                  value="HASTA"
                  control={<Radio />}
                  label="Hasta"
                />
              </RadioGroup>
            </FormControl>
            {formData.tipo === "DESDE" && (
              <TextField
                label="Hora desde"
                name="horaDesde"
                type="time"
                value={formData.horaDesde || ""}
                onChange={handleInputChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText="El feriado aplica desde esta hora hasta el fin del día"
              />
            )}
            {formData.tipo === "HASTA" && (
              <TextField
                label="Hora hasta"
                name="horaHasta"
                type="time"
                value={formData.horaHasta || ""}
                onChange={handleInputChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText="El feriado aplica desde el inicio del día hasta esta hora"
              />
            )}
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
            disabled={!isFormValid}
          >
            {isEditing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirmar eliminación"
        message="¿Está seguro que desea eliminar este feriado?"
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

export default FeriadosManagement;
