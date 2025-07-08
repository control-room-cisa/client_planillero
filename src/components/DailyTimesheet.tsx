import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Fab,
  useTheme,
  useMediaQuery,
  Drawer,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  Add,
  AccessTime,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { registroDiarioService } from '../services/registroDiarioService';
import { jobService } from '../services/jobService';
import type { ActivityFormData, Actividad, RegistroDiarioRequest } from '../types/registroDiario';
import type { Job } from '../types/job';

const DailyTimesheet: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<ActivityFormData>({
    descripcion: '',
    horasInvertidas: '',
    job: '',
    class: '',
    horaExtra: false,
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [, setActivities] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const response = await jobService.getJobs();
      if (response.success) {
        setJobs(response.data);
      }
    } catch (error) {
      console.error('Error al cargar jobs:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar la lista de jobs',
        severity: 'error',
      });
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
    // Cargar jobs cuando se abre el drawer
    if (jobs.length === 0) {
      loadJobs();
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    // Limpiar formulario al cerrar
    setFormData({
      descripcion: '',
      horasInvertidas: '',
      job: '',
      class: '',
      horaExtra: false,
    });
    setFormErrors({});
    setSelectedJob(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDateToISO = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const createRegistroDiarioPayload = (actividad: Actividad): RegistroDiarioRequest => {
    const fechaStr = formatDateToISO(currentDate);
    
    // Hora de entrada predeterminada (8:00 AM)
    const horaEntrada = new Date(currentDate);
    horaEntrada.setHours(8, 0, 0, 0);
    
    // Hora de salida predeterminada (5:00 PM)
    const horaSalida = new Date(currentDate);
    horaSalida.setHours(17, 0, 0, 0);

    return {
      fecha: fechaStr,
      horaEntrada: horaEntrada.toISOString(),
      horaSalida: horaSalida.toISOString(),
      jornada: 'M', // Mañana como default
      esDiaLibre: false,
      comentarioEmpleado: '',
      actividades: [actividad],
    };
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.descripcion.trim()) {
      errors.descripcion = 'La descripción es obligatoria';
    }

    if (!formData.horasInvertidas.trim()) {
      errors.horasInvertidas = 'Las horas invertidas son obligatorias';
    } else {
      const hours = parseFloat(formData.horasInvertidas);
      if (isNaN(hours) || hours <= 0) {
        errors.horasInvertidas = 'Ingresa un número válido mayor a 0';
      }
    }

    if (!selectedJob) {
      errors.job = 'Debes seleccionar un job';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Crear la actividad con los datos del formulario
      const actividad: Actividad = {
        jobId: selectedJob!.id,
        duracionHoras: parseFloat(formData.horasInvertidas),
        esExtra: formData.horaExtra,
        className: formData.class || undefined,
        descripcion: formData.descripcion,
      };

      // Crear el payload completo
      const payload = createRegistroDiarioPayload(actividad);

      // Enviar a la API
      const response = await registroDiarioService.crearRegistro(payload);

      if (response.success) {
        // Agregar la nueva actividad al estado
        setActivities(prev => [...prev, actividad]);
        
        // Mostrar mensaje de éxito
        setSnackbar({
          open: true,
          message: 'Actividad guardada correctamente',
          severity: 'success',
        });

        // Cerrar el drawer
        handleDrawerClose();
      }
    } catch (error) {
      console.error('Error al guardar actividad:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al guardar la actividad',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} de ${monthName} de ${year}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  // Datos simulados
  const workedHours = 0.0;
  const totalHours = 9.0;
  const progressPercentage = (workedHours / totalHours) * 100;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%' }}>
      {/* Header with date navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          component="h1"
          sx={{ fontWeight: 'bold', minWidth: 0 }}
        >
          Registro de Actividades
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateDate('prev')} size="small">
            <ChevronLeft />
          </IconButton>
          
          <Button
            variant={isToday() ? 'contained' : 'outlined'}
            startIcon={<CalendarToday />}
            onClick={goToToday}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            {isToday() ? 'Hoy' : 'Hoy'}
          </Button>
          
          <IconButton onClick={() => navigateDate('next')} size="small">
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {/* Current date display */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 1, textAlign: 'center' }}
      >
        {formatDate(currentDate)}
      </Typography>

      {/* Welcome message */}
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ mb: 3, textAlign: 'center', fontWeight: 'medium' }}
      >
        ¡Buen día, {user?.nombre}! 👋
      </Typography>

      {/* Work progress card */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              Progreso del Día Laboral
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              <Typography variant="body2" color="primary.main" fontWeight="bold">
                {workedHours.toFixed(1)} / {totalHours.toFixed(1)} horas
              </Typography>
            </Box>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 2,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
          
          <Typography variant="body2" color="warning.main">
            Faltan {(totalHours - workedHours).toFixed(1)} horas para completar el día
          </Typography>
        </CardContent>
      </Card>

      {/* Activities section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2">
          Actividades del Hoy
        </Typography>
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ borderRadius: 2 }}
            onClick={handleDrawerOpen}
          >
            Nueva Actividad
          </Button>
        )}
      </Box>

      {/* Empty state */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 4,
        }}
      >
        <AccessTime sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
        <Typography variant="h6" color="text.primary" gutterBottom>
          No hay actividades para Hoy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Comienza agregando tu primera actividad del día
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2 }}
          onClick={handleDrawerOpen}
        >
          Agregar Actividad
        </Button>
      </Box>

      {/* Floating Action Button for mobile */}
      {isMobile && (
        <Fab
          variant="extended"
          color="primary"
          aria-label="add"
          onClick={handleDrawerOpen}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            textTransform: 'none',
          }}
        >
          <Add sx={{ mr: 1 }} />
          Agregar Actividad
        </Fab>
      )}

      {/* Drawer para Nueva Actividad */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100vw',
          },
        }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" component="h2" fontWeight="bold">
              Nueva Actividad - Hoy
            </Typography>
            <IconButton onClick={handleDrawerClose} size="small">
              <Close />
            </IconButton>
          </Box>

          {/* Formulario */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Descripción de la Actividad */}
            <TextField
              fullWidth
              required
              multiline
              rows={4}
              name="descripcion"
              label="Descripción de la Actividad"
              placeholder="Describe la actividad realizada..."
              value={formData.descripcion}
              onChange={handleInputChange}
              error={!!formErrors.descripcion}
              helperText={formErrors.descripcion}
              sx={{ mb: 3 }}
            />

            {/* Horas Invertidas */}
            <TextField
              fullWidth
              required
              name="horasInvertidas"
              label="Horas Invertidas"
              placeholder="Ej: 2.5"
              type="number"
              inputProps={{
                step: 0.1,
                min: 0.1,
              }}
              value={formData.horasInvertidas}
              onChange={handleInputChange}
              error={!!formErrors.horasInvertidas}
              helperText={formErrors.horasInvertidas}
              sx={{ mb: 3 }}
            />

            {/* Job */}
            <Autocomplete
              fullWidth
              options={jobs}
              value={selectedJob}
              onChange={(_, newValue) => {
                setSelectedJob(newValue);
                // Limpiar error cuando se selecciona un job
                if (formErrors.job && newValue) {
                  setFormErrors(prev => ({ ...prev, job: '' }));
                }
              }}
              getOptionLabel={(option) => {
                const label = option.nombre || option.codigo || `Job ${option.id}`;
                return `${label} (ID: ${option.id})`;
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Job"
                  placeholder="Selecciona un job"
                  error={!!formErrors.job}
                  helperText={formErrors.job || 'Selecciona el job para esta actividad'}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingJobs ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={loadingJobs}
              disabled={loadingJobs}
              noOptionsText={loadingJobs ? "Cargando jobs..." : "No hay jobs disponibles"}
              sx={{ mb: 3 }}
            />

            {/* Class (opcional) */}
            <TextField
              fullWidth
              name="class"
              label="Class"
              placeholder="Clasificación (opcional)"
              value={formData.class}
              onChange={handleInputChange}
              sx={{ mb: 3 }}
            />

            {/* Hora Extra */}
            <FormControlLabel
              control={
                <Checkbox
                  name="horaExtra"
                  checked={formData.horaExtra}
                  onChange={handleInputChange}
                  color="primary"
                />
              }
              label="Hora Extra (fuera del horario 7AM - 5PM)"
              sx={{ mb: 3 }}
            />

            {/* Botones */}
            <Box sx={{ mt: 'auto', pt: 3 }}>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleDrawerClose}
                  sx={{ py: 1.5 }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                  sx={{ py: 1.5 }}
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyTimesheet; 