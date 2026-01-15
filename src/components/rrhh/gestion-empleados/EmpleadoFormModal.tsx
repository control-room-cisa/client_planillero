import * as React from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { AttachFile as AttachFileIcon } from "@mui/icons-material";
import type {
  CreateEmpleadoDto,
  UpdateEmpleadoDto,
  Empleado,
} from "../../../services/empleadoService";

import type { Departamento, Empresa } from "../../../types/auth";
import { useEmpleadoValidation } from "../../../hooks/useEmpleadoValidation";
import EmpleadoService from "../../../services/empleadoService";
import { Roles } from "../../../enums/roles";
import { getTipoHorarioLabel, TIPOS_HORARIO } from "../../../enums/tipoHorario";

/**
 * Convierte el valor mapeado de tipoContrato del backend al código del enum
 * Ejemplo: "7x7" -> "T7X7"
 */
const convertTipoContratoFromBackend = (
  value: string | null | undefined
): string | undefined => {
  if (!value) return undefined;
  const mapping: Record<string, string> = {
    "7x7": "T7X7",
    "14x14": "T14X14",
    "Indefinido Normal": "INDEFINIDO_NORMAL",
    "Por Hora": "POR_HORA",
    "21x7": "T21X7",
    Temporal: "TEMPORAL",
  };
  return mapping[value] || value;
};

/**
 * Convierte el valor mapeado de tipoCuenta del backend al código del enum
 * Ejemplo: "Ahorros moneda nacional" -> "AHORROS_MONEDA_NACIONAL"
 */
const convertTipoCuentaFromBackend = (
  value: string | null | undefined
): string | undefined => {
  if (!value) return undefined;
  const mapping: Record<string, string> = {
    "Ahorros moneda nacional": "AHORROS_MONEDA_NACIONAL",
    "Ahorros moneda extranjera": "AHORROS_MONEDA_EXTRANJERA",
    "Cheques moneda nacional": "CHEQUES_MONEDA_NACIONAL",
    "Cheques moneda extranjera": "CHEQUES_MONEDA_EXTRANJERA",
  };
  return mapping[value] || value;
};

interface EmpleadoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  empleado?: Empleado | null;
  empresas: Empresa[];
}

type EmpleadoFormData = Omit<
  CreateEmpleadoDto,
  "codigo" | "urlFotoPerfil" | "urlCv" | "departamento"
> & {
  contrasena: string;
  empresaId: number;
};

const EmpleadoFormModal: React.FC<EmpleadoFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
  empleado,
  empresas,
}) => {
  const isEditing = !!empleado;
  const {
    fieldErrors,
    validateForm,
    validateAndSetError,
    clearErrors,
    hasErrors,
  } = useEmpleadoValidation(isEditing);

  const [formData, setFormData] = React.useState<EmpleadoFormData>({
    nombre: "",
    apellido: "",
    correoElectronico: "",
    dni: "",
    profesion: "",
    cargo: "",
    sueldoMensual: 0,
    telefono: "",
    direccion: "",
    contrasena: "",
    rolId: Roles.EMPLEADO,
    departamentoId: 1,
    activo: true,
    nombreUsuario: "",
    tipoHorario: undefined,
    estadoCivil: undefined,
    nombreConyugue: "",
    tipoContrato: undefined,
    condicionSalud: "",
    nombreContactoEmergencia: "",
    numeroContactoEmergencia: "",
    banco: "",
    tipoCuenta: undefined,
    numeroCuenta: "",
    muerteBeneficiario: "",
    nombreMadre: "",
    nombrePadre: "",
    fechaInicioIngreso: undefined,
    editTime: undefined,
    empresaId: 0,
    /** campos faltantes */
  });

  const [selectedFiles, setSelectedFiles] = React.useState<{
    foto?: File;
    cv?: File;
  }>({});

  const [loading, setLoading] = React.useState(false);
  const [backendValidationErrors, setBackendValidationErrors] = React.useState<
    Array<{ field: string; message: string }>
  >([]);

  const [departamentosDisponibles, setDepartamentosDisponibles] =
    React.useState<Departamento[]>([]);
  // NEW: helper para encontrar la empresa a la que pertenece un departamento
  const getEmpresaIdFromDepartamento = React.useCallback(
    (departamentoId: number | undefined) => {
      if (!departamentoId) return 0;
      const emp = empresas.find((e) =>
        e.departamentos?.some((d) => d.id === departamentoId)
      );
      return emp?.id ?? 0;
    },
    [empresas]
  );
  // NEW
  React.useEffect(() => {
    if (formData.empresaId && formData.empresaId > 0) {
      const empresaSel = empresas.find((e) => e.id === formData.empresaId);
      const deps = empresaSel?.departamentos ?? [];
      setDepartamentosDisponibles(deps);

      // si el dep actual no pertenece a la nueva empresa, resetéalo
      if (!deps.some((d) => d.id === formData.departamentoId)) {
        setFormData((prev) => ({ ...prev, departamentoId: 0 }));
      }
    } else {
      setDepartamentosDisponibles([]);
      setFormData((prev) => ({ ...prev, departamentoId: 0 }));
    }
  }, [formData.empresaId, formData.departamentoId, empresas]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      if (isEditing && empleado) {
        loadEmpleadoData();
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
  }, [open, empleado, isEditing]);

  const loadEmpleadoData = async () => {
    if (!empleado) return;

    try {
      setLoading(true);
      const empleadoCompleto = await EmpleadoService.getById(empleado.id);

      const departamentoId = empleadoCompleto.departamentoId || 0;
      const empresaId = getEmpresaIdFromDepartamento(departamentoId);

      // prepara lista de departamentos según la empresa detectada
      const empresaSeleccionada = empresas.find((e) => e.id === empresaId);
      setDepartamentosDisponibles(empresaSeleccionada?.departamentos ?? []);

      setFormData({
        nombre: empleadoCompleto.nombre,
        apellido: empleadoCompleto.apellido || "",
        correoElectronico: empleadoCompleto.correoElectronico || "",
        dni: empleadoCompleto.dni || "",
        profesion: empleadoCompleto.profesion || "",
        cargo: empleadoCompleto.cargo || "",
        sueldoMensual: empleadoCompleto.sueldoMensual || 0,
        telefono: empleadoCompleto.telefono || "",
        direccion: empleadoCompleto.direccion || "",
        contrasena: "",
        rolId: empleadoCompleto.rolId || Roles.EMPLEADO,
        departamentoId, // CHANGED
        empresaId, // NEW
        activo: empleadoCompleto.activo ?? true,
        nombreUsuario: empleadoCompleto.nombreUsuario || "",
        tipoHorario: empleadoCompleto.tipoHorario as any,
        estadoCivil: empleadoCompleto.estadoCivil as any,
        nombreConyugue: empleadoCompleto.nombreConyugue || "",
        tipoContrato: convertTipoContratoFromBackend(
          empleadoCompleto.tipoContrato
        ) as any,
        condicionSalud: empleadoCompleto.condicionSalud || "",
        nombreContactoEmergencia:
          empleadoCompleto.nombreContactoEmergencia || "",
        numeroContactoEmergencia:
          empleadoCompleto.numeroContactoEmergencia || "",
        banco: empleadoCompleto.banco || "",
        tipoCuenta: convertTipoCuentaFromBackend(
          empleadoCompleto.tipoCuenta
        ) as any,
        numeroCuenta: empleadoCompleto.numeroCuenta || "",
        muerteBeneficiario: empleadoCompleto.muerteBeneficiario || "",
        nombreMadre: empleadoCompleto.nombreMadre || "",
        nombrePadre: empleadoCompleto.nombrePadre || "",
        fechaInicioIngreso: empleadoCompleto.fechaInicioIngreso
          ? new Date(empleadoCompleto.fechaInicioIngreso)
          : undefined,
        editTime: empleadoCompleto.editTime
          ? new Date(empleadoCompleto.editTime)
          : undefined,
      });
    } catch (error) {
      console.error("Error al cargar datos del empleado:", error);
      onError("Error al cargar los datos del empleado");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      correoElectronico: "",
      dni: "",
      profesion: "",
      cargo: "",
      sueldoMensual: 0,
      telefono: "",
      direccion: "",
      contrasena: "",
      rolId: Roles.EMPLEADO,
      departamentoId: 1,
      activo: true,
      nombreUsuario: "",
      tipoHorario: undefined,
      estadoCivil: undefined,
      nombreConyugue: "",
      tipoContrato: undefined,
      condicionSalud: "",
      nombreContactoEmergencia: "",
      numeroContactoEmergencia: "",
      banco: "",
      tipoCuenta: undefined,
      numeroCuenta: "",
      muerteBeneficiario: "",
      nombreMadre: "",
      nombrePadre: "",
      fechaInicioIngreso: undefined,
      editTime: undefined,
      empresaId: 0,
    });
    setSelectedFiles({});
    setBackendValidationErrors([]);
    clearErrors();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData({
      ...formData,
      [name]: newValue,
    });

    validateAndSetError(name, newValue);
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    validateAndSetError(name, value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setSelectedFiles({
        ...selectedFiles,
        [name]: files[0],
      });
    }
  };

  const handleSubmit = async () => {
    const errors = validateForm(formData);

    if (Object.keys(errors).filter((key) => errors[key]).length > 0) {
      onError("Por favor corrija los errores en el formulario");
      return;
    }

    try {
      setLoading(true);

      if (isEditing && empleado) {
        const { contrasena, empresaId, ...updateFields } = formData;
        const updateData: UpdateEmpleadoDto = {
          id: empleado.id,
          ...updateFields,
          // Solo incluir contraseña si no está vacía
          ...(contrasena.trim() ? { contrasena } : {}),
          // Incluir editTime si tiene un valor
          ...(formData.editTime ? { editTime: formData.editTime } : {}),
        };
        await EmpleadoService.update(updateData, selectedFiles);
        onSuccess("Colaborador actualizado exitosamente");
      } else {
        // Ensure all required fields for CreateEmpleadoDto are present
        const createData: CreateEmpleadoDto = {
          ...formData,
          urlFotoPerfil: "", // or selectedFiles?.urlFotoPerfil if needed
          codigo: "", // provide a default or generate as needed
          departamento: "", // provide a default or map from departamentoId if needed
          urlCv: "", // or selectedFiles?.urlCv if needed
        };
        await EmpleadoService.create(createData, selectedFiles);
        onSuccess("Colaborador creado exitosamente");
      }

      onClose();
    } catch (err: any) {
      console.error("Error al guardar empleado:", err);

      // Extraer errores de validación del backend si están disponibles
      if (err.validationErrors && Array.isArray(err.validationErrors)) {
        setBackendValidationErrors(err.validationErrors);
        // También mostrar el mensaje general
        const errorMessage =
          err.message ||
          (isEditing
            ? "Error al actualizar el colaborador"
            : "Error al crear el colaborador");
        onError(errorMessage);
      } else {
        // Limpiar errores de validación si no hay
        setBackendValidationErrors([]);
        // Extraer mensaje de error del backend si está disponible
        const errorMessage =
          err.message ||
          (isEditing
            ? "Error al actualizar el colaborador"
            : "Error al crear el colaborador");
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.nombre &&
      formData.nombreUsuario &&
      formData.tipoHorario &&
      formData.tipoContrato &&
      formData.tipoCuenta &&
      formData.rolId &&
      formData.empresaId &&
      formData.departamentoId &&
      (isEditing || formData.contrasena) &&
      !hasErrors()
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? "Editar Colaborador" : "Agregar Colaborador"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          {/* Información Básica */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Información Básica
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Nombre *"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!fieldErrors.nombre}
              helperText={fieldErrors.nombre}
            />
            <TextField
              label="Apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleInputChange}
              fullWidth
              error={!!fieldErrors.apellido}
              helperText={fieldErrors.apellido}
            />
            <TextField
              label="Correo Electrónico"
              name="correoElectronico"
              type="email"
              value={formData.correoElectronico}
              onChange={handleInputChange}
              fullWidth
              error={!!fieldErrors.correoElectronico}
              helperText={fieldErrors.correoElectronico}
            />
            <TextField
              label="Nombre de Usuario *"
              name="nombreUsuario"
              value={formData.nombreUsuario}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!fieldErrors.nombreUsuario}
              helperText={fieldErrors.nombreUsuario}
            />
            <TextField
              label="DNI"
              name="dni"
              value={formData.dni}
              onChange={handleInputChange}
              fullWidth
              error={!!fieldErrors.dni}
              helperText={fieldErrors.dni}
            />
            <TextField
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              fullWidth
              error={!!fieldErrors.telefono}
              helperText={fieldErrors.telefono}
            />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                label="Dirección"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                error={!!fieldErrors.direccion}
                helperText={fieldErrors.direccion}
              />
            </Box>
          </Box>

          {/* Información Laboral */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Información Laboral
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.cargo}
                helperText={fieldErrors.cargo}
              />
              <TextField
                label="Profesión"
                name="profesion"
                value={formData.profesion}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.profesion}
                helperText={fieldErrors.profesion}
              />
              <FormControl fullWidth error={!!fieldErrors.tipoHorario}>
                <InputLabel shrink={!!formData.tipoHorario}>
                  Horario *
                </InputLabel>
                <Select
                  name="tipoHorario"
                  value={formData.tipoHorario || ""}
                  onChange={handleSelectChange}
                  label="Horario *"
                  required
                >
                  <MenuItem value="" disabled>
                    <em>Seleccionar horario</em>
                  </MenuItem>
                  {TIPOS_HORARIO.map((tipo) => (
                    <MenuItem key={tipo} value={tipo}>
                      {getTipoHorarioLabel(tipo)}
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.tipoHorario && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {fieldErrors.tipoHorario}
                  </Typography>
                )}
              </FormControl>

              <FormControl fullWidth error={!!fieldErrors.tipoContrato}>
                <InputLabel
                  shrink={
                    !!formData.tipoContrato || formData.tipoContrato === ""
                  }
                >
                  Contrato *
                </InputLabel>
                <Select
                  name="tipoContrato"
                  value={formData.tipoContrato || ""}
                  onChange={handleSelectChange}
                  label="Contrato *"
                  notched={
                    !!formData.tipoContrato || formData.tipoContrato === ""
                  }
                  required
                >
                  <MenuItem value="" disabled>
                    <em>Seleccionar contrato</em>
                  </MenuItem>
                  <MenuItem value="T7X7">7x7</MenuItem>
                  <MenuItem value="T14X14">14x14</MenuItem>
                  <MenuItem value="INDEFINIDO_NORMAL">
                    Indefinido Normal
                  </MenuItem>
                  <MenuItem value="POR_HORA">Por Hora</MenuItem>
                  <MenuItem value="T21X7">21x7</MenuItem>
                  <MenuItem value="TEMPORAL">Temporal</MenuItem>
                </Select>
                {fieldErrors.tipoContrato && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {fieldErrors.tipoContrato}
                  </Typography>
                )}
              </FormControl>

              <TextField
                label="Sueldo Mensual"
                name="sueldoMensual"
                type="number"
                value={formData.sueldoMensual}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sueldoMensual:
                      parseFloat(Number(e.target.value).toFixed(2)) || 0,
                  })
                }
                fullWidth
                error={!!fieldErrors.sueldoMensual}
                helperText={fieldErrors.sueldoMensual}
              />

              <TextField
                label="Fecha de Ingreso"
                name="fechaInicioIngreso"
                type="date"
                value={
                  formData.fechaInicioIngreso
                    ? new Date(formData.fechaInicioIngreso)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Fecha/Hora Límite de Edición"
                name="editTime"
                type="datetime-local"
                value={
                  formData.editTime
                    ? (() => {
                        const date = new Date(formData.editTime);
                        // Ajustar a la zona horaria local para datetime-local
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(
                          2,
                          "0"
                        );
                        const day = String(date.getDate()).padStart(2, "0");
                        const hours = String(date.getHours()).padStart(2, "0");
                        const minutes = String(date.getMinutes()).padStart(
                          2,
                          "0"
                        );
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                      })()
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    editTime: value ? new Date(value) : undefined,
                  });
                }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Permite editar registros fuera del rango normal hasta esta fecha/hora"
              />

              <FormControl fullWidth error={!!fieldErrors.rolId}>
                <InputLabel>Rol *</InputLabel>
                <Select
                  name="rolId"
                  value={formData.rolId}
                  onChange={handleSelectChange}
                  label="Rol *"
                  required
                >
                  <MenuItem value={Roles.EMPLEADO}>Colaborador</MenuItem>
                  <MenuItem value={Roles.SUPERVISOR}>Supervisor</MenuItem>
                  <MenuItem value={Roles.RRHH}>RRHH</MenuItem>
                  <MenuItem value={Roles.SUPERVISOR_CONTABILIDAD}>
                    Supervisor Contabilidad
                  </MenuItem>
                  <MenuItem value={Roles.ASISTENTE_CONTABILIDAD}>
                    Asistente Contabilidad
                  </MenuItem>
                </Select>
                {fieldErrors.rolId && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {fieldErrors.rolId}
                  </Typography>
                )}
              </FormControl>

              {/* Empresa */}
              <FormControl fullWidth>
                <InputLabel>Empresa *</InputLabel>
                <Select
                  name="empresaId"
                  value={formData.empresaId}
                  onChange={handleSelectChange}
                  label="Empresa *"
                  required
                >
                  <MenuItem value={0} disabled>
                    <em>Seleccionar empresa</em>
                  </MenuItem>
                  {empresas
                    .filter((empresa) => empresa.esConsorcio !== false)
                    .map((empresa) => (
                      <MenuItem key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Departamento (dependiente de Empresa) */}
              <FormControl
                fullWidth
                error={!!fieldErrors.departamentoId}
                disabled={formData.empresaId === 0}
              >
                <InputLabel>Departamento *</InputLabel>
                <Select
                  name="departamentoId"
                  value={formData.departamentoId}
                  onChange={handleSelectChange}
                  label="Departamento *"
                  required
                >
                  <MenuItem value={0} disabled>
                    <em>
                      {formData.empresaId === 0
                        ? "Primero selecciona una empresa"
                        : departamentosDisponibles.length === 0
                        ? "No hay departamentos disponibles"
                        : "Seleccionar departamento"}
                    </em>
                  </MenuItem>
                  {departamentosDisponibles.map((dep) => (
                    <MenuItem key={dep.id} value={dep.id}>
                      {dep.nombre}
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.departamentoId && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {fieldErrors.departamentoId}
                  </Typography>
                )}
              </FormControl>

              <TextField
                label={isEditing ? "Nueva Contraseña" : "Contraseña *"}
                name="contrasena"
                type="password"
                value={formData.contrasena}
                onChange={handleInputChange}
                fullWidth
                required={!isEditing}
                error={!!fieldErrors.contrasena}
                helperText={
                  fieldErrors.contrasena ||
                  (isEditing ? "Dejar en blanco para mantener la actual" : "")
                }
                placeholder={isEditing ? "Dejar en blanco para no cambiar" : ""}
              />

              <Box sx={{ gridColumn: "1 / -1" }}>
                <FormControlLabel
                  control={
                    <Switch
                      name="activo"
                      checked={formData.activo}
                      onChange={handleInputChange}
                    />
                  }
                  label="Colaborador Activo"
                />
              </Box>
            </Box>
          </Box>

          {/* Información Personal Adicional */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Información Personal Adicional
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel
                  shrink={!!formData.estadoCivil || formData.estadoCivil === ""}
                >
                  Estado Civil
                </InputLabel>
                <Select
                  name="estadoCivil"
                  value={formData.estadoCivil || ""}
                  onChange={handleSelectChange}
                  label="Estado Civil"
                  notched={
                    !!formData.estadoCivil || formData.estadoCivil === ""
                  }
                >
                  <MenuItem value="" disabled>
                    <em>Seleccionar estado</em>
                  </MenuItem>
                  <MenuItem value="SOLTERO">Soltero</MenuItem>
                  <MenuItem value="CASADO">Casado</MenuItem>
                  <MenuItem value="UNION_LIBRE">Unión Libre</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Nombre del Cónyuge"
                name="nombreConyugue"
                value={formData.nombreConyugue}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.nombreConyugue}
                helperText={fieldErrors.nombreConyugue}
              />

              <TextField
                label="Condición de Salud"
                name="condicionSalud"
                value={formData.condicionSalud}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.condicionSalud}
                helperText={fieldErrors.condicionSalud}
              />
            </Box>
          </Box>

          {/* Contacto de Emergencia */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Contacto de Emergencia
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Nombre del Contacto de Emergencia"
                name="nombreContactoEmergencia"
                value={formData.nombreContactoEmergencia}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.nombreContactoEmergencia}
                helperText={fieldErrors.nombreContactoEmergencia}
              />
              <TextField
                label="Teléfono de Emergencia"
                name="numeroContactoEmergencia"
                value={formData.numeroContactoEmergencia}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.numeroContactoEmergencia}
                helperText={fieldErrors.numeroContactoEmergencia}
              />
            </Box>
          </Box>

          {/* Información Bancaria */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Información Bancaria
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Banco"
                name="banco"
                value={formData.banco}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.banco}
                helperText={fieldErrors.banco}
              />
              <FormControl fullWidth required error={!!fieldErrors.tipoCuenta}>
                <InputLabel
                  shrink={!!formData.tipoCuenta || formData.tipoCuenta === ""}
                >
                  Tipo de Cuenta *
                </InputLabel>
                <Select
                  name="tipoCuenta"
                  value={formData.tipoCuenta || ""}
                  onChange={handleSelectChange}
                  label="Tipo de Cuenta *"
                  notched={!!formData.tipoCuenta || formData.tipoCuenta === ""}
                  required
                >
                  <MenuItem value="" disabled>
                    <em>Seleccionar tipo</em>
                  </MenuItem>
                  <MenuItem value="AHORROS_MONEDA_NACIONAL">
                    Ahorros moneda nacional
                  </MenuItem>
                  <MenuItem value="AHORROS_MONEDA_EXTRANJERA">
                    Ahorros moneda extranjera
                  </MenuItem>
                  <MenuItem value="CHEQUES_MONEDA_NACIONAL">
                    Cheques moneda nacional
                  </MenuItem>
                  <MenuItem value="CHEQUES_MONEDA_EXTRANJERA">
                    Cheques moneda extranjera
                  </MenuItem>
                </Select>
                {fieldErrors.tipoCuenta && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1 }}
                  >
                    {fieldErrors.tipoCuenta}
                  </Typography>
                )}
              </FormControl>
              <TextField
                label="Número de Cuenta"
                name="numeroCuenta"
                value={formData.numeroCuenta}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.numeroCuenta}
                helperText={fieldErrors.numeroCuenta}
              />
              <TextField
                label="Beneficiario por Muerte"
                name="muerteBeneficiario"
                value={formData.muerteBeneficiario}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.muerteBeneficiario}
                helperText={fieldErrors.muerteBeneficiario}
              />
            </Box>
          </Box>

          {/* Información Familiar */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Información Familiar
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Nombre de la Madre"
                name="nombreMadre"
                value={formData.nombreMadre}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.nombreMadre}
                helperText={fieldErrors.nombreMadre}
              />
              <TextField
                label="Nombre del Padre"
                name="nombrePadre"
                value={formData.nombrePadre}
                onChange={handleInputChange}
                fullWidth
                error={!!fieldErrors.nombrePadre}
                helperText={fieldErrors.nombrePadre}
              />
            </Box>
          </Box>

          {/* Documentos */}
          <Divider textAlign="left">
            <Typography variant="h6" color="primary">
              Documentos
            </Typography>
          </Divider>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                fullWidth
              >
                Foto de Perfil
                <input
                  type="file"
                  name="foto"
                  accept="image/*"
                  onChange={handleFileChange}
                  hidden
                />
              </Button>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                fullWidth
              >
                CV
                <input
                  type="file"
                  name="cv"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  hidden
                />
              </Button>
              {selectedFiles.foto && (
                <Typography variant="caption" color="success.main">
                  Archivo seleccionado: {selectedFiles.foto.name}
                </Typography>
              )}
              {selectedFiles.cv && (
                <Typography variant="caption" color="success.main">
                  Archivo seleccionado: {selectedFiles.cv.name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Errores de validación del backend */}
          {backendValidationErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <AlertTitle sx={{ fontWeight: 600 }}>
                Errores de validación
              </AlertTitle>
              <List dense sx={{ py: 0, mt: 1 }}>
                {backendValidationErrors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" component="span">
                          <strong style={{ textTransform: "capitalize" }}>
                            {error.field.replace(/([A-Z])/g, " $1").trim()}:
                          </strong>{" "}
                          {error.message}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !isFormValid()}
        >
          {isEditing ? "Actualizar" : "Crear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmpleadoFormModal;
