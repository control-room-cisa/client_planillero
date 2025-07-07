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

interface ActivityData {
  descripcion: string;
  horasInvertidas: string;
  job: string;
  class: string;
  horaExtra: boolean;
}

const DailyTimesheet: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState<ActivityData>({
    descripcion: '',
    horasInvertidas: '',
    job: '',
    class: '',
    horaExtra: false,
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
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

    if (!formData.job.trim()) {
      errors.job = 'El job es obligatorio';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // TODO: Aquí se conectará con el endpoint cuando esté disponible
      console.log('Datos del formulario:', formData);
      alert('Actividad guardada correctamente (simulado)');
      handleDrawerClose();
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
            <TextField
              fullWidth
              required
              name="job"
              label="Job"
              placeholder="Código o nombre del trabajo"
              value={formData.job}
              onChange={handleInputChange}
              error={!!formErrors.job}
              helperText={formErrors.job}
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
                  sx={{ py: 1.5 }}
                >
                  Guardar
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default DailyTimesheet; 