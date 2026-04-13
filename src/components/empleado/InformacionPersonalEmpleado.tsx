import * as React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import EventIcon from "@mui/icons-material/Event";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useAuth } from "../../hooks/useAuth";
import EmpleadoService, {
  type Empleado,
  type UpdateMiPerfilDto,
} from "../../services/empleadoService";
import { getImageUrl } from "../../utils/imageUtils";
import { getTipoHorarioLabel } from "../../enums/tipoHorario";

function safeToNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDias(horas: number | null | undefined): number | null {
  if (horas === null || horas === undefined) return null;
  return horas / 8;
}

function cleanOptionalString(v?: string | null): string | undefined {
  if (v === null || v === undefined) return undefined;
  const value = v.trim();
  return value.length ? value : undefined;
}

const MAX_IMAGE_SIZE = 1200;
const ESTADO_CIVIL_OPTIONS = [
  { value: "SOLTERO", label: "Soltero" },
  { value: "CASADO", label: "Casado" },
  { value: "UNION_LIBRE", label: "Unión libre" },
] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = src;
  });
}

async function buildSquaredImageFile(
  sourceUrl: string,
  cropAreaPixels: Area,
  fileName = "foto-perfil.jpg"
): Promise<File> {
  const image = await loadImage(sourceUrl);
  const size = Math.min(
    MAX_IMAGE_SIZE,
    Math.max(1, Math.round(Math.min(cropAreaPixels.width, cropAreaPixels.height)))
  );
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No fue posible procesar la imagen.");

  ctx.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  if (!blob) throw new Error("No fue posible generar la imagen recortada.");

  return new File([blob], fileName, { type: "image/jpeg" });
}

export default function InformacionPersonalEmpleado() {
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [empleado, setEmpleado] = React.useState<Empleado | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = React.useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = React.useState(false);
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState<UpdateMiPerfilDto>({});
  const [rawImageUrl, setRawImageUrl] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(
    null
  );
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
        const emp = await EmpleadoService.getById(user.id);
        setEmpleado(emp);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Error al cargar información personal");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [user?.id]);

  const vacacionesHoras = safeToNumber(empleado?.tiempoVacacionesHoras);
  const compensatorioHoras = safeToNumber(
    empleado?.tiempoCompensatorioHoras
  );

  const vacacionesDias = toDias(vacacionesHoras);
  const fotoActual = getImageUrl(empleado?.urlFotoPerfil);

  const onCropComplete = React.useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleOpenFilePicker = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCloseCropDialog = React.useCallback(() => {
    setCropDialogOpen(false);
    if (rawImageUrl) {
      URL.revokeObjectURL(rawImageUrl);
    }
    setRawImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [rawImageUrl]);

  const handlePhotoSelected = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Selecciona un archivo de imagen válido.");
        return;
      }

      const nextRawUrl = URL.createObjectURL(file);
      setRawImageUrl(nextRawUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropDialogOpen(true);
    },
    []
  );

  const handleSaveCroppedPhoto = React.useCallback(async () => {
    if (!empleado?.id || !rawImageUrl || !croppedAreaPixels) return;

    try {
      setUpdatingPhoto(true);
      setError(null);
      const croppedFile = await buildSquaredImageFile(
        rawImageUrl,
        croppedAreaPixels,
        `foto-perfil-${empleado.id}.jpg`
      );
      const actualizado = await EmpleadoService.updateMyProfile(
        {},
        { foto: croppedFile }
      );
      setEmpleado(actualizado);
      setPhotoDialogOpen(false);
      handleCloseCropDialog();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error al actualizar la foto de perfil");
    } finally {
      setUpdatingPhoto(false);
    }
  }, [croppedAreaPixels, empleado, handleCloseCropDialog, rawImageUrl]);

  const handleOpenEditDialog = React.useCallback(() => {
    if (!empleado) return;
    setProfileForm({
      profesion: empleado.profesion ?? "",
      correoElectronico: empleado.correoElectronico ?? "",
      telefono: empleado.telefono ?? "",
      direccion: empleado.direccion ?? "",
      estadoCivil: empleado.estadoCivil ?? "",
      nombreConyugue: empleado.nombreConyugue ?? "",
      condicionSalud: empleado.condicionSalud ?? "",
      nombreContactoEmergencia: empleado.nombreContactoEmergencia ?? "",
      numeroContactoEmergencia: empleado.numeroContactoEmergencia ?? "",
      nombreMadre: empleado.nombreMadre ?? "",
      nombrePadre: empleado.nombrePadre ?? "",
      muerteBeneficiario: empleado.muerteBeneficiario ?? "",
    });
    setEditDialogOpen(true);
  }, [empleado]);

  const handleProfileInputChange = React.useCallback(
    (field: keyof UpdateMiPerfilDto, value: string) => {
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSaveProfile = React.useCallback(async () => {
    try {
      setSavingProfile(true);
      setError(null);

      const payload: UpdateMiPerfilDto = {
        profesion: cleanOptionalString(profileForm.profesion),
        correoElectronico: cleanOptionalString(profileForm.correoElectronico),
        telefono: cleanOptionalString(profileForm.telefono),
        direccion: cleanOptionalString(profileForm.direccion),
        estadoCivil: cleanOptionalString(profileForm.estadoCivil),
        nombreConyugue: cleanOptionalString(profileForm.nombreConyugue),
        condicionSalud: cleanOptionalString(profileForm.condicionSalud),
        nombreContactoEmergencia: cleanOptionalString(
          profileForm.nombreContactoEmergencia
        ),
        numeroContactoEmergencia: cleanOptionalString(
          profileForm.numeroContactoEmergencia
        ),
        nombreMadre: cleanOptionalString(profileForm.nombreMadre),
        nombrePadre: cleanOptionalString(profileForm.nombrePadre),
        muerteBeneficiario: cleanOptionalString(profileForm.muerteBeneficiario),
      };

      const actualizado = await EmpleadoService.updateMyProfile(payload);
      setEmpleado(actualizado);
      setEditDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error al actualizar información personal");
    } finally {
      setSavingProfile(false);
    }
  }, [profileForm]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!empleado) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No se encontró tu información.</Typography>
      </Box>
    );
  }

  const estadoChip = (
    <Chip
      label={empleado.activo ? "Activo" : "Inactivo"}
      color={empleado.activo ? "success" : "error"}
      variant="outlined"
      size="small"
    />
  );

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        height: "100%",
        p: { xs: 2, md: 3 },
        maxWidth: 1200,
        mx: "auto",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        mb={3}
        alignItems={{ xs: "flex-start", md: "stretch" }}
      >
        <Box>
          <Avatar
            src={fotoActual}
            alt={`${empleado.nombre} ${empleado.apellido || ""}`}
            sx={{
              width: { xs: 110, md: 132 },
              height: { xs: 110, md: 132 },
              cursor: "pointer",
            }}
            onClick={() => setPhotoDialogOpen(true)}
          >
            {empleado.nombre?.[0]}
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoSelected}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            {empleado.nombre} {empleado.apellido || ""}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <Typography variant="body2" color="text.secondary">
              {empleado.cargo || "Sin cargo"}
            </Typography>
            {estadoChip}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <Typography variant="body2" color="text.secondary">
              <strong>Código:</strong> {empleado.codigo || "N/A"}
            </Typography>
          </Stack>
        </Box>

        <Box
          sx={{
            width: { xs: "100%", md: "auto" },
            display: "flex",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            alignItems: { xs: "flex-start", md: "center" },
          }}
        >
          <Button variant="outlined" onClick={handleOpenEditDialog}>
            Editar información
          </Button>
        </Box>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonIcon fontSize="small" />
              Información Personal
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Nombre de Usuario:</strong>{" "}
                {empleado.nombreUsuario || "N/A"}
              </Typography>
              <Typography>
                <strong>DNI:</strong> {empleado.dni || "N/A"}
              </Typography>
              <Typography>
                <strong>Email:</strong> {empleado.correoElectronico || "N/A"}
              </Typography>
              <Typography>
                <strong>Profesión:</strong> {empleado.profesion || "N/A"}
              </Typography>
              <Typography>
                <strong>Teléfono:</strong> {empleado.telefono || "N/A"}
              </Typography>
              <Typography>
                <strong>Dirección:</strong> {empleado.direccion || "N/A"}
              </Typography>

              <Typography>
                <strong>Estado Civil:</strong> {empleado.estadoCivil || "N/A"}
              </Typography>
              <Typography>
                <strong>Nombre del Cónyuge:</strong>{" "}
                {empleado.nombreConyugue || "N/A"}
              </Typography>
              <Typography>
                <strong>Condición de Salud:</strong>{" "}
                {empleado.condicionSalud || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <WorkIcon fontSize="small" />
              Información Laboral
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Departamento:</strong> {empleado.departamento || "N/A"}
              </Typography>
              <Typography>
                <strong>Cargo:</strong> {empleado.cargo || "N/A"}
              </Typography>
              <Typography>
                <strong>Sueldo:</strong>{" "}
                {empleado.sueldoMensual !== undefined && empleado.sueldoMensual !== null
                  ? `L ${empleado.sueldoMensual.toFixed(2)}`
                  : "N/A"}
              </Typography>
              <Typography>
                <strong>Tipo de Horario:</strong>{" "}
                {getTipoHorarioLabel(empleado.tipoHorario)}
              </Typography>
              <Typography>
                <strong>Tipo de Contrato:</strong>{" "}
                {empleado.tipoContrato || "N/A"}
              </Typography>
              <Typography>
                <strong>Fecha de Ingreso:</strong>{" "}
                {empleado.fechaInicioIngreso
                  ? new Date(empleado.fechaInicioIngreso).toLocaleDateString()
                  : "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <EventIcon fontSize="small" />
              Vacaciones y Tiempo Compensatorio
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Vacaciones:</strong>{" "}
                {vacacionesHoras !== null
                  ? `${vacacionesDias?.toFixed(2)} días (${vacacionesHoras} horas)`
                  : "N/A"}
              </Typography>
              <Typography>
                <strong>Tiempo Compensatorio:</strong>{" "}
                {compensatorioHoras !== null
                  ? `${compensatorioHoras} horas`
                  : "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonAddIcon fontSize="small" />
              Contacto de Emergencia
            </Typography>
            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Nombre:</strong>{" "}
                {empleado.nombreContactoEmergencia || "N/A"}
              </Typography>
              <Typography>
                <strong>Teléfono:</strong>{" "}
                {empleado.numeroContactoEmergencia || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <AccountBalanceIcon fontSize="small" />
              Información Bancaria
            </Typography>

            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Banco:</strong> {empleado.banco || "N/A"}
              </Typography>
              <Typography>
                <strong>Tipo de Cuenta:</strong> {empleado.tipoCuenta || "N/A"}
              </Typography>
              <Typography>
                <strong>Número de Cuenta:</strong>{" "}
                {empleado.numeroCuenta || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography
              color="primary"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <FamilyRestroomIcon fontSize="small" />
              Información Familiar
            </Typography>
            <Stack spacing={1} mt={2}>
              <Typography>
                <strong>Nombre de la Madre:</strong>{" "}
                {empleado.nombreMadre || "N/A"}
              </Typography>
              <Typography>
                <strong>Nombre del Padre:</strong>{" "}
                {empleado.nombrePadre || "N/A"}
              </Typography>
              <Typography>
                <strong>Beneficiario por Muerte:</strong>{" "}
                {empleado.muerteBeneficiario || "N/A"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog
        open={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Foto de perfil</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <Avatar
              src={fotoActual}
              alt={`${empleado.nombre} ${empleado.apellido || ""}`}
              sx={{ width: 320, height: 320 }}
            >
              {empleado.nombre?.[0]}
            </Avatar>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button onClick={() => setPhotoDialogOpen(false)}>Cerrar</Button>
          <Button
            variant="contained"
            onClick={handleOpenFilePicker}
            disabled={updatingPhoto}
          >
            Editar foto
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cropDialogOpen}
        onClose={updatingPhoto ? undefined : handleCloseCropDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Recortar foto de perfil</DialogTitle>
        <DialogContent>
          <Box sx={{ position: "relative", width: "100%", height: 320, bgcolor: "#111" }}>
            {rawImageUrl ? (
              <Cropper
                image={rawImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </Box>
          <Box sx={{ px: 1, pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Zoom
            </Typography>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(_, value) => setZoom(value as number)}
              disabled={updatingPhoto}
            />
            <Typography variant="caption" color="text.secondary">
              La imagen se guardará cuadrada y con tamaño máximo de 1200x1200 px.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button onClick={handleCloseCropDialog} disabled={updatingPhoto}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCroppedPhoto}
            disabled={updatingPhoto || !croppedAreaPixels}
          >
            {updatingPhoto ? "Guardando..." : "Guardar foto"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={savingProfile ? undefined : () => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Editar información personal</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <TextField
              label="Profesión"
              value={profileForm.profesion ?? ""}
              onChange={(e) => handleProfileInputChange("profesion", e.target.value)}
              fullWidth
            />
            <TextField
              label="Correo electrónico"
              value={profileForm.correoElectronico ?? ""}
              onChange={(e) =>
                handleProfileInputChange("correoElectronico", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={profileForm.telefono ?? ""}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/(?!^\+)[^\d]/g, "");
                handleProfileInputChange("telefono", sanitized);
              }}
              fullWidth
              helperText="Solo números y '+' al inicio"
            />
            <TextField
              label="Dirección"
              value={profileForm.direccion ?? ""}
              onChange={(e) => handleProfileInputChange("direccion", e.target.value)}
              fullWidth
            />
            <TextField
              label="Estado civil"
              select
              value={profileForm.estadoCivil ?? ""}
              onChange={(e) =>
                handleProfileInputChange("estadoCivil", e.target.value)
              }
              fullWidth
            >
              <MenuItem value="">Sin especificar</MenuItem>
              {ESTADO_CIVIL_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nombre del cónyuge"
              value={profileForm.nombreConyugue ?? ""}
              onChange={(e) =>
                handleProfileInputChange("nombreConyugue", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Condición de salud"
              value={profileForm.condicionSalud ?? ""}
              onChange={(e) =>
                handleProfileInputChange("condicionSalud", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Nombre contacto de emergencia"
              value={profileForm.nombreContactoEmergencia ?? ""}
              onChange={(e) =>
                handleProfileInputChange("nombreContactoEmergencia", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Número contacto de emergencia"
              value={profileForm.numeroContactoEmergencia ?? ""}
              onChange={(e) =>
                handleProfileInputChange("numeroContactoEmergencia", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Nombre de la madre"
              value={profileForm.nombreMadre ?? ""}
              onChange={(e) =>
                handleProfileInputChange("nombreMadre", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Nombre del padre"
              value={profileForm.nombrePadre ?? ""}
              onChange={(e) =>
                handleProfileInputChange("nombrePadre", e.target.value)
              }
              fullWidth
            />
            <TextField
              label="Beneficiario por muerte"
              value={profileForm.muerteBeneficiario ?? ""}
              onChange={(e) =>
                handleProfileInputChange("muerteBeneficiario", e.target.value)
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={savingProfile}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

