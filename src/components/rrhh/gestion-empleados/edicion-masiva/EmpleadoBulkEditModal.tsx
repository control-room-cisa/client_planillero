import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import type { Empleado, UpdateEmpleadoDto } from "../../../../services/empleadoService";
import EmpleadoService from "../../../../services/empleadoService";
import ConfirmDialog from "../../../common/ConfirmDialog";
import {
  BULK_EDIT_FIELDS,
  MAX_CAMPOS_EDICION_MASIVA,
  groupedBulkFields,
  readBulkFieldValue,
  validateBulkField,
  valuesEqual,
  type BulkEditFieldDef,
  type BulkEditFieldKey,
} from "./bulkEditFields";

interface EmpleadoBulkEditModalProps {
  open: boolean;
  empleados: Empleado[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type BulkRow = {
  id: number;
  codigo: string;
  nombre: string;
  apellido: string;
  original: Record<BulkEditFieldKey, string>;
  draft: Record<BulkEditFieldKey, string>;
  fieldErrors: Partial<Record<BulkEditFieldKey, string>>;
  saveError: string | null;
  saving: boolean;
};

const emptyFieldMap = (): Record<BulkEditFieldKey, string> => {
  const map = {} as Record<BulkEditFieldKey, string>;
  for (const field of BULK_EDIT_FIELDS) map[field.key] = "";
  return map;
};

const buildRowFromEmpleado = (empleado: Empleado): BulkRow => {
  const original = emptyFieldMap();
  for (const field of BULK_EDIT_FIELDS) {
    original[field.key] = readBulkFieldValue(empleado, field.key);
  }
  return {
    id: empleado.id,
    codigo: empleado.codigo || "—",
    nombre: empleado.nombre || "",
    apellido: empleado.apellido || "",
    original,
    draft: { ...original },
    fieldErrors: {},
    saveError: null,
    saving: false,
  };
};

const dirtyKeysOfRow = (
  row: BulkRow,
  fields: BulkEditFieldKey[],
): BulkEditFieldKey[] =>
  fields.filter((key) => !valuesEqual(row.draft[key], row.original[key]));

const rowHasFieldErrors = (row: BulkRow, fields: BulkEditFieldKey[]) =>
  fields.some((key) => Boolean(row.fieldErrors[key]));

const EmpleadoBulkEditModal: React.FC<EmpleadoBulkEditModalProps> = ({
  open,
  empleados,
  onClose,
  onSuccess,
  onError,
}) => {
  const [step, setStep] = React.useState<"pick" | "edit">("pick");
  const [selectedKeys, setSelectedKeys] = React.useState<BulkEditFieldKey[]>(
    [],
  );
  const [rows, setRows] = React.useState<BulkRow[]>([]);
  const [loadingRows, setLoadingRows] = React.useState(false);
  const [savingAll, setSavingAll] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [confirmBack, setConfirmBack] = React.useState(false);
  const rowsRef = React.useRef<BulkRow[]>([]);
  rowsRef.current = rows;

  const selectedFields = React.useMemo(
    () =>
      selectedKeys
        .map((key) => BULK_EDIT_FIELDS.find((f) => f.key === key))
        .filter((f): f is BulkEditFieldDef => Boolean(f)),
    [selectedKeys],
  );

  const dirtyRowCount = React.useMemo(
    () =>
      rows.filter((row) => dirtyKeysOfRow(row, selectedKeys).length > 0).length,
    [rows, selectedKeys],
  );

  const resetState = React.useCallback(() => {
    setStep("pick");
    setSelectedKeys([]);
    setRows([]);
    setLoadingRows(false);
    setSavingAll(false);
    setConfirmClose(false);
    setConfirmBack(false);
  }, []);

  React.useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const hasUnsaved = dirtyRowCount > 0;

  const requestClose = () => {
    if (hasUnsaved) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  const toggleField = (key: BulkEditFieldKey) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_CAMPOS_EDICION_MASIVA) return prev;
      return [...prev, key];
    });
  };

  const loadRows = async () => {
    if (empleados.length === 0) {
      onError("No hay colaboradores en el filtro actual");
      return;
    }
    setLoadingRows(true);
    try {
      const ids = empleados.map((e) => e.id);
      const loaded: Empleado[] = [];
      const batchSize = 8;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const details = await Promise.all(
          batch.map((id) => EmpleadoService.getById(id)),
        );
        loaded.push(...details);
      }
      const nextRows = loaded
        .map(buildRowFromEmpleado)
        .sort((a, b) =>
          `${a.nombre} ${a.apellido}`
            .toLowerCase()
            .localeCompare(`${b.nombre} ${b.apellido}`.toLowerCase()),
        );
      setRows(nextRows);
      setStep("edit");
    } catch (err) {
      console.error("Error al cargar colaboradores para edición masiva:", err);
      onError("Error al cargar los datos de los colaboradores");
    } finally {
      setLoadingRows(false);
    }
  };

  const updateDraft = (
    rowId: number,
    key: BulkEditFieldKey,
    value: string,
  ) => {
    const error = validateBulkField(key, value);
    setRows((prev) =>
      prev.map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              draft: { ...row.draft, [key]: value },
              fieldErrors: { ...row.fieldErrors, [key]: error || undefined },
              saveError: null,
            },
      ),
    );
  };

  const saveRow = async (row: BulkRow): Promise<boolean> => {
    const dirty = dirtyKeysOfRow(row, selectedKeys);
    if (dirty.length === 0) return true;
    if (rowHasFieldErrors(row, selectedKeys)) return false;

    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, saving: true, saveError: null } : r)),
    );

    const payload: UpdateEmpleadoDto = { id: row.id };
    for (const key of dirty) {
      const value = row.draft[key].trim();
      if (key === "fechaInicioIngreso") {
        payload.fechaInicioIngreso = value
          ? (value as unknown as Date)
          : undefined;
      } else if (key === "tipoCuenta") {
        payload.tipoCuenta = (value ||
          undefined) as UpdateEmpleadoDto["tipoCuenta"];
      } else {
        (payload as Record<string, unknown>)[key] = value;
      }
    }

    try {
      await EmpleadoService.update(payload);
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== row.id) return r;
          const nextOriginal = { ...r.original };
          for (const key of dirty) nextOriginal[key] = row.draft[key];
          return {
            ...r,
            original: nextOriginal,
            saving: false,
            saveError: null,
          };
        }),
      );
      return true;
    } catch (err: any) {
      const message =
        err?.validationErrors?.[0]?.message ||
        err?.message ||
        "Error al guardar";
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, saving: false, saveError: message } : r,
        ),
      );
      return false;
    }
  };

  const handleSaveRow = async (row: BulkRow) => {
    const ok = await saveRow(row);
    if (ok) onSuccess(`Cambios guardados: ${row.nombre} ${row.apellido}`.trim());
  };

  const handleSaveAll = async () => {
    const pending = rowsRef.current.filter(
      (row) => dirtyKeysOfRow(row, selectedKeys).length > 0,
    );
    if (pending.length === 0) return;
    const invalid = pending.filter((row) => rowHasFieldErrors(row, selectedKeys));
    if (invalid.length > 0) {
      onError("Corrige los campos con error antes de guardar");
      return;
    }
    setSavingAll(true);
    let okCount = 0;
    let failCount = 0;
    for (const row of pending) {
      const latest = rowsRef.current.find((r) => r.id === row.id) ?? row;
      const ok = await saveRow(latest);
      if (ok) okCount += 1;
      else failCount += 1;
    }
    setSavingAll(false);
    if (failCount === 0) {
      onSuccess(
        okCount === 1
          ? "Se guardó 1 colaborador"
          : `Se guardaron ${okCount} colaboradores`,
      );
    } else {
      onError(
        `Guardados: ${okCount}. Con error: ${failCount}. Revisa las filas marcadas.`,
      );
    }
  };

  const handleBack = () => {
    if (hasUnsaved) {
      setConfirmBack(true);
      return;
    }
    setStep("pick");
    setRows([]);
  };

  const stickyCellSx = {
    position: "sticky" as const,
    left: 0,
    zIndex: 2,
    bgcolor: "background.paper",
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        maxWidth={step === "pick" ? "sm" : "xl"}
        fullWidth
        fullScreen={step === "edit"}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 2 }}>
          {step === "edit" && (
            <IconButton onClick={handleBack} aria-label="Volver" size="small">
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            {step === "pick"
              ? "Edición masiva — elegir campos"
              : "Edición masiva de colaboradores"}
          </Box>
          {step === "edit" && dirtyRowCount > 0 && (
            <Chip
              size="small"
              color="warning"
              label={`${dirtyRowCount} sin guardar`}
            />
          )}
        </DialogTitle>

        <DialogContent dividers>
          {step === "pick" && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Elige hasta {MAX_CAMPOS_EDICION_MASIVA} campos. Luego verás a
                los {empleados.length} colaboradores del filtro actual, con
                código, nombre y apellido fijos.
              </Typography>
              {groupedBulkFields().map(({ group, fields }) => (
                <Box key={group} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {group}
                  </Typography>
                  <FormGroup>
                    {fields.map((field) => {
                      const checked = selectedKeys.includes(field.key);
                      const disabled =
                        !checked &&
                        selectedKeys.length >= MAX_CAMPOS_EDICION_MASIVA;
                      return (
                        <FormControlLabel
                          key={field.key}
                          control={
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleField(field.key)}
                              size="small"
                            />
                          }
                          label={field.label}
                        />
                      );
                    })}
                  </FormGroup>
                </Box>
              ))}
            </Box>
          )}

          {step === "edit" && loadingRows && (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }} color="text.secondary">
                Cargando datos de los colaboradores…
              </Typography>
            </Box>
          )}

          {step === "edit" && !loadingRows && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Las celdas en ámbar tienen cambios que aún no están en la base
                de datos. Código, nombre y apellido no se editan aquí.
              </Typography>
              <TableContainer sx={{ maxHeight: "calc(100vh - 220px)" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...stickyCellSx, zIndex: 3, minWidth: 88 }}>
                        Código
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>Nombre</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>Apellido</TableCell>
                      {selectedFields.map((field) => (
                        <TableCell key={field.key} sx={{ minWidth: 180 }}>
                          {field.label}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ minWidth: 88 }}>
                        Fila
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const dirtyKeys = dirtyKeysOfRow(row, selectedKeys);
                      const rowDirty = dirtyKeys.length > 0;
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell sx={stickyCellSx}>{row.codigo}</TableCell>
                          <TableCell>{row.nombre}</TableCell>
                          <TableCell>{row.apellido}</TableCell>
                          {selectedFields.map((field) => {
                            const dirty = dirtyKeys.includes(field.key);
                            const error = row.fieldErrors[field.key];
                            const cellBg = dirty ? "warning.light" : undefined;
                            if (field.kind === "select") {
                              return (
                                <TableCell
                                  key={field.key}
                                  sx={{ bgcolor: cellBg, py: 0.5 }}
                                >
                                  <FormControl fullWidth size="small" error={!!error}>
                                    <Select
                                      value={row.draft[field.key]}
                                      displayEmpty
                                      onChange={(e) =>
                                        updateDraft(
                                          row.id,
                                          field.key,
                                          String(e.target.value),
                                        )
                                      }
                                    >
                                      <MenuItem value="">
                                        <em>Sin valor</em>
                                      </MenuItem>
                                      {(field.options || []).map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </TableCell>
                              );
                            }
                            return (
                              <TableCell
                                key={field.key}
                                sx={{ bgcolor: cellBg, py: 0.5 }}
                              >
                                <TextField
                                  size="small"
                                  fullWidth
                                  type={field.kind === "date" ? "date" : "text"}
                                  value={row.draft[field.key]}
                                  onChange={(e) =>
                                    updateDraft(row.id, field.key, e.target.value)
                                  }
                                  error={!!error}
                                  helperText={error || undefined}
                                  inputProps={{ maxLength: field.maxLength }}
                                  InputLabelProps={
                                    field.kind === "date" ? { shrink: true } : undefined
                                  }
                                />
                              </TableCell>
                            );
                          })}
                          <TableCell align="right">
                            <Tooltip title="Guardar esta fila">
                              <span>
                                <IconButton
                                  color="primary"
                                  disabled={
                                    !rowDirty ||
                                    row.saving ||
                                    savingAll ||
                                    rowHasFieldErrors(row, selectedKeys)
                                  }
                                  onClick={() => handleSaveRow(row)}
                                >
                                  {row.saving ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <SaveIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                            {row.saveError && (
                              <Typography variant="caption" color="error" display="block">
                                {row.saveError}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {rows.some((r) => r.saveError) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Algunas filas no se pudieron guardar. Revisa el mensaje en la
                  fila.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={requestClose}>Cerrar</Button>
          {step === "pick" && (
            <Button
              variant="contained"
              disabled={selectedKeys.length === 0 || loadingRows}
              onClick={loadRows}
            >
              {loadingRows ? "Cargando…" : "Continuar"}
            </Button>
          )}
          {step === "edit" && (
            <Button
              variant="contained"
              startIcon={savingAll ? <CircularProgress size={16} /> : <SaveIcon />}
              disabled={dirtyRowCount === 0 || savingAll || loadingRows}
              onClick={handleSaveAll}
            >
              Guardar todos ({dirtyRowCount})
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmClose}
        title="Cambios sin guardar"
        message="Hay celdas editadas que aún no se guardaron. Si cierras, se perderán."
        confirmText="Cerrar sin guardar"
        cancelText="Seguir editando"
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
        onCancel={() => setConfirmClose(false)}
      />
      <ConfirmDialog
        open={confirmBack}
        title="Cambios sin guardar"
        message="Si vuelves a elegir campos, se perderán los cambios no guardados."
        confirmText="Volver"
        cancelText="Seguir editando"
        onConfirm={() => {
          setConfirmBack(false);
          setStep("pick");
          setRows([]);
        }}
        onCancel={() => setConfirmBack(false)}
      />
    </>
  );
};

export default EmpleadoBulkEditModal;
