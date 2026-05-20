import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
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
  type SelectChangeEvent,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import AccesoContabilidadService, {
  type AccesoContabilidad,
  type AccesoContabilidadCatalogEmpleado,
  type AccesoContabilidadCatalogEmpresa,
  type CreateAccesoContabilidadDto,
} from "../../services/accesoContabilidadService";
import ConfirmDialog from "../common/ConfirmDialog";

const labelEmpleado = (e: AccesoContabilidadCatalogEmpleado) => {
  const nombre = [e.nombre, e.apellido].filter(Boolean).join(" ");
  return e.codigo ? `${nombre} (${e.codigo})` : nombre;
};

const labelEmpresa = (emp: AccesoContabilidadCatalogEmpresa) => {
  const n = emp.nombre || "";
  return emp.codigo ? `${n} (${emp.codigo})` : n;
};

const formatDt = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-HN");
  } catch {
    return iso;
  }
};

const AccesoContabilidadManagement: React.FC = () => {
  const [rows, setRows] = React.useState<AccesoContabilidad[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [current, setCurrent] = React.useState<AccesoContabilidad | null>(null);
  const [empleadosCat, setEmpleadosCat] = React.useState<
    AccesoContabilidadCatalogEmpleado[]
  >([]);
  const [empresasCat, setEmpresasCat] = React.useState<
    AccesoContabilidadCatalogEmpresa[]
  >([]);
  const [loadingDialog, setLoadingDialog] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<CreateAccesoContabilidadDto>({
    empleadoId: -1,
    empresaId: -1,
  });
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    id: number | null;
  }>({ open: false, id: null });

  const showSnackbar = React.useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await AccesoContabilidadService.getAll();
      setRows(data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Error al cargar accesos";
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadCatalogos = React.useCallback(async () => {
    setLoadingDialog(true);
    try {
      const { empleados, empresas } =
        await AccesoContabilidadService.getCatalogos();
      setEmpleadosCat(empleados);
      setEmpresasCat(empresas);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Error al cargar catálogos";
      showSnackbar(msg, "error");
    } finally {
      setLoadingDialog(false);
    }
  }, [showSnackbar]);

  const openCreate = async () => {
    setIsEditing(false);
    setCurrent(null);
    setForm({ empleadoId: -1, empresaId: -1 });
    setDialogOpen(true);
    await loadCatalogos();
  };

  const openEdit = async (row: AccesoContabilidad) => {
    setIsEditing(true);
    setCurrent(row);
    setForm({
      empleadoId: row.empleadoId,
      empresaId: row.empresaId,
    });
    setDialogOpen(true);
    await loadCatalogos();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCurrent(null);
    setIsEditing(false);
  };

  const handleSelect = (e: SelectChangeEvent<number>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name as string]: Number(value),
    }));
  };

  const handleSave = async () => {
    if (form.empleadoId < 1 || form.empresaId < 1) {
      showSnackbar("Seleccione colaborador y empresa", "error");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && current) {
        await AccesoContabilidadService.update(current.id, form);
        showSnackbar("Acceso actualizado correctamente", "success");
      } else {
        await AccesoContabilidadService.create(form);
        showSnackbar("Acceso creado correctamente", "success");
      }
      closeDialog();
      await fetchList();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Error al guardar";
      showSnackbar(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (id: number) => setConfirm({ open: true, id });

  const confirmDelete = async () => {
    if (confirm.id == null) return;
    try {
      await AccesoContabilidadService.delete(confirm.id);
      showSnackbar("Acceso eliminado", "success");
      setConfirm({ open: false, id: null });
      await fetchList();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Error al eliminar";
      showSnackbar(msg, "error");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h5" component="h1" fontWeight="bold">
          Accesos asistentes de contabilidad
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => void openCreate()}
        >
          Nuevo acceso
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Solo asistentes de contabilidad y empresas consorcio. Cada par
        colaborador–empresa es único entre registros activos. Al editar se
        conserva historial (se cierra el registro anterior y se crea uno
        nuevo).
      </Typography>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Creado por</TableCell>
                <TableCell>Fecha creación</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No hay accesos registrados
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.empleado
                        ? labelEmpleado(
                            r.empleado as AccesoContabilidadCatalogEmpleado
                          )
                        : r.empleadoId}
                    </TableCell>
                    <TableCell>
                      {r.empresa
                        ? labelEmpresa(
                            r.empresa as AccesoContabilidadCatalogEmpresa
                          )
                        : r.empresaId}
                    </TableCell>
                    <TableCell>
                      {r.creadoPor
                        ? [r.creadoPor.nombre, r.creadoPor.apellido]
                            .filter(Boolean)
                            .join(" ")
                        : r.createdBy}
                    </TableCell>
                    <TableCell>{formatDt(r.createdAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label="editar"
                        onClick={() => void openEdit(r)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="eliminar"
                        onClick={() => requestDelete(r.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {isEditing ? "Editar acceso" : "Nuevo acceso"}
        </DialogTitle>
        <DialogContent>
          {loadingDialog ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              <FormControl fullWidth size="small">
                <InputLabel id="empleado-label">
                  Asistente contabilidad
                </InputLabel>
                <Select
                  labelId="empleado-label"
                  name="empleadoId"
                  value={form.empleadoId}
                  label="Asistente contabilidad"
                  onChange={handleSelect}
                >
                  <MenuItem value={-1} disabled>
                    Seleccione…
                  </MenuItem>
                  {empleadosCat.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {labelEmpleado(e)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="empresa-label">Empresa (consorcio)</InputLabel>
                <Select
                  labelId="empresa-label"
                  name="empresaId"
                  value={form.empresaId}
                  label="Empresa (consorcio)"
                  onChange={handleSelect}
                >
                  <MenuItem value={-1} disabled>
                    Seleccione…
                  </MenuItem>
                  {empresasCat.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {labelEmpresa(emp)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving || loadingDialog}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar acceso"
        message="¿Eliminar este acceso? El colaborador dejará de tener la asignación a esa empresa."
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={() => void confirmDelete()}
        confirmText="Eliminar"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AccesoContabilidadManagement;
