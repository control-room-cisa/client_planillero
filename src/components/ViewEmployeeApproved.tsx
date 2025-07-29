import React, { useEffect, useState, useCallback } from "react";
import {
    Box,
    Paper,
    Typography,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Stack,
    LinearProgress,
    Grow,
    Snackbar,
    Alert,
    IconButton,
    Drawer,
    TextField,
    Button,
    Autocomplete,
    FormControlLabel,
    Checkbox,
    CircularProgress,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { es } from "date-fns/locale";
import type { PlanillaStatus } from "./rrhh/planillaConstants";
import type { ActividadData, RegistroDiarioData } from "../dtos/RegistrosDiariosDataDto";
import RegistroDiarioService from "../services/registroDiarioService";
import { Edit } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import type { Job } from "../services/jobService";
import JobService from "../services/jobService";

interface Props {
    startDate: Date | null;
    endDate: Date | null;
    status: PlanillaStatus;
}

const ViewEmployeeApproved: React.FC<Props> = ({
    startDate,
    endDate,
    status,
}) => {
    const [registros, setRegistros] = useState<RegistroDiarioData[]>([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error"; }>({ open: false, message: "", severity: "success" });

    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editingActividad, setEditingActividad] = useState<ActividadData | null>(null);
    const [editingFecha, setEditingFecha] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        descripcion: "",
        horasInvertidas: "",
        job: "",
        class: "",
        horaExtra: false,
    });
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [loadingJobs, setLoadingJobs] = useState(false);


    const fetchRegistros = useCallback(async () => {
        if (!startDate || !endDate) {
            setRegistros([]);
            return;
        }
        setLoading(true);
        try {
            const days: string[] = [];
            const current = new Date(startDate);
            while (current <= endDate) {
                days.push(current.toISOString().split("T")[0]);
                current.setDate(current.getDate() + 1);
            }
            const results = await Promise.all(
                days.map((fecha) => RegistroDiarioService.getByDate(fecha))
                // OJO: getByDate debe retornar los registros del empleado autenticado
            );
            const filtered = results
                .filter((r): r is RegistroDiarioData => r !== null)
                .filter((r) => {
                    switch (status) {
                        case "Pendiente":
                            return r.aprobacionSupervisor == null;
                        case "Aprobado":
                            return r.aprobacionSupervisor === true;
                        case "Rechazado":
                            return r.aprobacionSupervisor === false;
                        default:
                            return true;
                    }
                });
            setRegistros(filtered);
        } catch (err) {
            setSnackbar({ open: true, message: "Error al cargar registros", severity: "error" });
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, status]);

    useEffect(() => {
        fetchRegistros();
    }, [fetchRegistros]);

    const handleCloseSnackbar = () =>
        setSnackbar((prev) => ({ ...prev, open: false }));

    const formatTimeCorrectly = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
        });
    };

    const handleEditActividad = async (actividad: ActividadData, fecha: string) => {
        setEditingActividad(actividad);
        setEditingFecha(fecha);
        setFormData({
            descripcion: actividad.descripcion || "",
            horasInvertidas: actividad.duracionHoras.toString(),
            job: actividad.jobId?.toString() || "",
            class: actividad.className || "",
            horaExtra: actividad.esExtra || false,
        });

        // Cargar jobs
        setLoadingJobs(true);
        try {
            const jobList = await JobService.getAll();
            const activos = jobList.filter((j) => j.activo);
            setJobs(activos);
            const matched = activos.find((j) => j.id === actividad.jobId);
            if (matched) setSelectedJob(matched);
        } catch (err) {
            console.error("Error al cargar jobs", err);
        } finally {
            setLoadingJobs(false);
        }

        setEditDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setEditDrawerOpen(false);
        setEditingActividad(null);
        setEditingFecha(null);
        setFormErrors({});
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleJobChange = (_e: any, value: Job | null) => {
        setSelectedJob(value);
        setFormData((prev) => ({
            ...prev,
            job: value?.id.toString() || "",
        }));
        if (formErrors.job) {
            setFormErrors((prev) => ({ ...prev, job: "" }));
        }
    };

    const validateForm = () => {
        const errors: { [key: string]: string } = {};
        if (!formData.descripcion.trim()) errors.descripcion = "Requerido";
        if (!formData.horasInvertidas || parseFloat(formData.horasInvertidas) <= 0)
            errors.horasInvertidas = "Debe ser mayor a 0";
        if (!formData.job) errors.job = "Seleccione un job";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!editingActividad || !editingFecha) return;
        if (!validateForm()) return;

        try {
            setLoading(true);
            const registro = await RegistroDiarioService.getByDate(editingFecha);
            if (!registro || !registro.actividades) throw new Error("Registro no encontrado");

            const actividadesActualizadas = registro.actividades.map((a) =>
                a.id === editingActividad.id
                    ? {
                        ...a,
                        descripcion: formData.descripcion,
                        duracionHoras: parseFloat(formData.horasInvertidas),
                        jobId: parseInt(formData.job),
                        className: formData.class || undefined,
                        esExtra: formData.horaExtra,
                    }
                    : a
            );

            await RegistroDiarioService.upsert({
                fecha: editingFecha,
                horaEntrada: registro.horaEntrada,
                horaSalida: registro.horaSalida,
                jornada: registro.jornada,
                esDiaLibre: registro.esDiaLibre,
                comentarioEmpleado: registro.comentarioEmpleado,
                actividades: actividadesActualizadas,
            });

            setSnackbar({ open: true, message: "Actividad actualizada", severity: "success" });
            fetchRegistros(); // recargar
            handleDrawerClose();
        } catch (err) {
            console.error("Error al actualizar actividad", err);
            setSnackbar({ open: true, message: "Error al guardar", severity: "error" });
        } finally {
            setLoading(false);
        }
    };


    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                    Mis registros diarios
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ height: 4, mb: 2 }}>
                    {loading && (
                        <LinearProgress sx={{ transition: "opacity 0.5s", opacity: loading ? 1 : 0 }} />
                    )}
                </Box>

                <Stack spacing={2}>
                    {registros.map((registro, idx) => {
                        const normales =
                            registro.actividades
                                ?.filter((a) => !a.esExtra)
                                .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
                        const extras =
                            registro.actividades
                                ?.filter((a) => a.esExtra)
                                .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
                        const total = normales + extras;

                        return (
                            <Grow key={registro.id!} in={!loading} timeout={300 + idx * 100}>
                                <Paper sx={{ p: 3, borderRadius: 2 }}>
                                    <Stack direction="row" spacing={4} alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="subtitle1">{registro.fecha}</Typography>
                                        {!registro.esDiaLibre ? (
                                            <>
                                                <Typography variant="body2">
                                                    Entrada: {formatTimeCorrectly(registro.horaEntrada)}
                                                </Typography>
                                                <Typography variant="body2">
                                                    Salida: {formatTimeCorrectly(registro.horaSalida)}
                                                </Typography>
                                            </>
                                        ) : (
                                            <Chip label="Día libre" color="info" />
                                        )}
                                    </Stack>

                                    {registro.comentarioEmpleado && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            <strong>Mi comentario:</strong> {registro.comentarioEmpleado}
                                        </Typography>
                                    )}

                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="subtitle2" gutterBottom>
                                        Actividades
                                    </Typography>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Descripción</TableCell>
                                                <TableCell>Horas</TableCell>
                                                <TableCell>Job</TableCell>
                                                <TableCell>Código</TableCell>
                                                <TableCell>Tipo</TableCell>
                                                <TableCell>Clase</TableCell>
                                                {registro.aprobacionSupervisor === false && (
                                                    <TableCell>Editar</TableCell>
                                                )}
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {registro.actividades
                                                ?.slice()
                                                .sort((a, b) =>
                                                    a.esExtra === b.esExtra ? 0 : a.esExtra ? 1 : -1
                                                )
                                                .map((act: ActividadData) => (
                                                    <TableRow key={act.id ?? act.jobId}>
                                                        <TableCell>{act.descripcion}</TableCell>
                                                        <TableCell>
                                                            <Chip label={`${act.duracionHoras}h`} size="small" />
                                                        </TableCell>
                                                        <TableCell>{act.job?.nombre}</TableCell>
                                                        <TableCell>{act.job?.codigo}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={act.esExtra ? "Extra" : "Normal"}
                                                                size="small"
                                                                color={act.esExtra ? "error" : "default"}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{act.className || "-"}</TableCell>
                                                        {registro.aprobacionSupervisor === false && (
                                                            <TableCell>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        if (registro.fecha) {
                                                                            handleEditActividad(act, registro.fecha);
                                                                        }
                                                                    }}
                                                                    sx={{ color: "primary.main" }}
                                                                >
                                                                    <Edit />
                                                                </IconButton>

                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                        </TableBody>

                                    </Table>

                                    {/* Resumen de horas */}
                                    <Box sx={{ mt: 2, mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Resumen de horas
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" color="text.secondary">
                                                Normales:
                                            </Typography>
                                            <Chip label={`${normales}h`} size="small" variant="outlined" />
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                                Extras:
                                            </Typography>
                                            <Chip label={`${extras}h`} size="small" color="error" variant="outlined" />
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                                Total:
                                            </Typography>
                                            <Chip label={`${total}h`} size="small" color="primary" variant="outlined" />
                                        </Stack>
                                    </Box>

                                    {/* Estado del supervisor */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Revisión del supervisor
                                        </Typography>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            {registro.aprobacionSupervisor === true && (
                                                <Chip
                                                    label="Aprobado por el supervisor"
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            )}
                                            {registro.aprobacionSupervisor === false && (
                                                <>
                                                    <Chip
                                                        label="Rechazado por el supervisor"
                                                        color="error"
                                                        variant="outlined"
                                                    />
                                                    {registro.comentarioSupervisor && (
                                                        <Typography variant="body2">
                                                            <strong>Comentario:</strong> {registro.comentarioSupervisor}
                                                        </Typography>
                                                    )}
                                                </>
                                            )}
                                            {registro.aprobacionSupervisor === null && (
                                                <Chip
                                                    label="Pendiente"
                                                    color="warning"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                </Paper>
                            </Grow>
                        );
                    })}

                    {!loading && registros.length === 0 && (
                        <Typography>
                            No hay registros para las fechas seleccionadas.
                        </Typography>
                    )}
                </Stack>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={handleCloseSnackbar}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={snackbar.severity}
                        sx={{ width: "100%" }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
                <Drawer
                    anchor="right"
                    open={editDrawerOpen}
                    onClose={handleDrawerClose}
                    PaperProps={{
                        sx: { width: { xs: "100%", sm: 400 }, maxWidth: "100vw" },
                    }}
                >
                    <Box
                        sx={{
                            p: 3,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Header */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 3,
                            }}
                        >
                            <Typography variant="h6" fontWeight="bold">
                                Editar Actividad
                            </Typography>
                            <IconButton onClick={handleDrawerClose} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        {/* Form */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <TextField
                                fullWidth
                                required
                                multiline
                                rows={4}
                                name="descripcion"
                                label="Descripción"
                                value={formData.descripcion}
                                onChange={handleFormChange}
                                error={!!formErrors.descripcion}
                                helperText={formErrors.descripcion}
                                sx={{ mb: 3 }}
                            />
                            <TextField
                                fullWidth
                                required
                                name="horasInvertidas"
                                label="Horas Invertidas"
                                type="number"
                                inputProps={{ step: 0.1, min: 0.1 }}
                                value={formData.horasInvertidas}
                                onChange={handleFormChange}
                                error={!!formErrors.horasInvertidas}
                                helperText={formErrors.horasInvertidas}
                                sx={{ mb: 3 }}
                            />
                            <Box sx={{ mb: 3 }}>
                                <Autocomplete
                                    options={jobs}
                                    getOptionLabel={(option) => `${option.codigo} - ${option.nombre}`}
                                    value={selectedJob}
                                    onChange={handleJobChange}
                                    loading={loadingJobs}
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Job"
                                            required
                                            error={!!formErrors.job}
                                            helperText={formErrors.job}
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {loadingJobs && <CircularProgress size={20} />}
                                                        {params.InputProps.endAdornment}
                                                    </>
                                                ),
                                            }}
                                        />
                                    )}
                                />
                            </Box>
                            <TextField
                                fullWidth
                                name="class"
                                label="Clase (opcional)"
                                value={formData.class}
                                onChange={handleFormChange}
                                sx={{ mb: 3 }}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="horaExtra"
                                        checked={formData.horaExtra}
                                        onChange={handleFormChange}
                                        color="primary"
                                    />
                                }
                                label="Hora Extra"
                                sx={{ mb: 3 }}
                            />
                            <Box sx={{ mt: "auto", pt: 3 }}>
                                <Divider sx={{ mb: 3 }} />
                                <Box sx={{ display: "flex", gap: 2 }}>
                                    <Button variant="outlined" fullWidth onClick={handleDrawerClose}>
                                        Cancelar
                                    </Button>
                                    <Button variant="contained" fullWidth onClick={handleSubmit} disabled={loading}>
                                        {loading ? "Guardando..." : "Actualizar"}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Drawer>


            </Box>
        </LocalizationProvider>
    );
};

export default ViewEmployeeApproved;