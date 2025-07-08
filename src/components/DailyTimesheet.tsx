import React, { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Stack,
  Chip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  Add,
  AccessTime,
  Close,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import RegistroDiarioService from '../services/registroDiarioService';
import type { RegistroDiarioData } from '../services/registroDiarioService';

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
  
  // Estado para los datos del día laboral
  const [registroDiario, setRegistroDiario] = useState<RegistroDiarioData | null>(null);
  const [dayConfigData, setDayConfigData] = useState({
    horaEntrada: '',
    horaSalida: '',
    jornada: 'M',
    esDiaLibre: false,
    comentarioEmpleado: '',
  });
  const [dayConfigErrors, setDayConfigErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Cargar datos del registro diario cuando cambie la fecha
  useEffect(() => {
    loadRegistroDiario();
  }, [currentDate]);
  
  const loadRegistroDiario = async () => {
    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const registro = await RegistroDiarioService.getByDate(dateString);
      setRegistroDiario(registro);
      
      if (registro) {
        // Extraer solo la hora de la fecha ISO sin conversión de zona horaria
        const horaEntrada = registro.horaEntrada.substring(11, 16); // "YYYY-MM-DDTHH:MM:SS" → "HH:MM"
        const horaSalida = registro.horaSalida.substring(11, 16); // "YYYY-MM-DDTHH:MM:SS" → "HH:MM"
        
        setDayConfigData({
          horaEntrada,
          horaSalida,
          jornada: registro.jornada || 'M',
          esDiaLibre: registro.esDiaLibre || false,
          comentarioEmpleado: registro.comentarioEmpleado || '',
        });
      } else {
        // Resetear el formulario si no hay datos
        setDayConfigData({
          horaEntrada: '07:00',
          horaSalida: '17:00',
          jornada: 'M',
          esDiaLibre: false,
          comentarioEmpleado: '',
        });
      }
    } catch (error) {
      console.error('Error al cargar registro diario:', error);
      setSnackbar({ open: true, message: 'Error al cargar los datos del día', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

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



  const handleDayConfigInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setDayConfigData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (dayConfigErrors[name]) {
      setDayConfigErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateDayConfig = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!dayConfigData.horaEntrada) {
      errors.horaEntrada = 'La hora de entrada es obligatoria';
    }

    if (!dayConfigData.horaSalida) {
      errors.horaSalida = 'La hora de salida es obligatoria';
    }

    if (dayConfigData.horaEntrada && dayConfigData.horaSalida) {
      const entrada = new Date(`2000-01-01T${dayConfigData.horaEntrada}:00`);
      const salida = new Date(`2000-01-01T${dayConfigData.horaSalida}:00`);
      
      if (entrada >= salida) {
        errors.horaSalida = 'La hora de salida debe ser posterior a la de entrada';
      }
    }

    setDayConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const hasChangesInDayConfig = (): boolean => {
    if (!registroDiario) return false;
    
    // Extraer solo la hora de la fecha ISO sin conversión de zona horaria
    const registroHoraEntrada = registroDiario.horaEntrada.substring(11, 16);
    const registroHoraSalida = registroDiario.horaSalida.substring(11, 16);
    
    return (
      dayConfigData.horaEntrada !== registroHoraEntrada ||
      dayConfigData.horaSalida !== registroHoraSalida ||
      dayConfigData.jornada !== registroDiario.jornada ||
      dayConfigData.esDiaLibre !== registroDiario.esDiaLibre ||
      dayConfigData.comentarioEmpleado !== (registroDiario.comentarioEmpleado || '')
    );
  };

  const handleDayConfigSubmit = async () => {
    if (!validateDayConfig()) return;

    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Crear fechas ISO completas para el día seleccionado
      const horaEntrada = new Date(`${dateString}T${dayConfigData.horaEntrada}:00.000Z`);
      const horaSalida = new Date(`${dateString}T${dayConfigData.horaSalida}:00.000Z`);

      const params = {
        fecha: dateString,
        horaEntrada: horaEntrada.toISOString(),
        horaSalida: horaSalida.toISOString(),
        jornada: dayConfigData.jornada,
        esDiaLibre: dayConfigData.esDiaLibre,
        comentarioEmpleado: dayConfigData.comentarioEmpleado,
        actividades: registroDiario?.actividades?.map(act => ({
          jobId: act.jobId,
          duracionHoras: act.duracionHoras,
          esExtra: act.esExtra,
          className: act.className,
          descripcion: act.descripcion,
        })) || [],
      };

      const updatedRegistro = await RegistroDiarioService.upsert(params);
      setRegistroDiario(updatedRegistro);
      setSnackbar({ open: true, message: 'Configuración del día guardada correctamente', severity: 'success' });
    } catch (error) {
      console.error('Error al guardar configuración del día:', error);
      setSnackbar({ open: true, message: 'Error al guardar la configuración', severity: 'error' });
    } finally {
      setLoading(false);
    }
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split('T')[0];
      
      const actividad = {
        jobId: parseInt(formData.job), // Asumiendo que job es el ID numérico
        duracionHoras: parseFloat(formData.horasInvertidas),
        esExtra: formData.horaExtra,
        className: formData.class || undefined,
        descripcion: formData.descripcion,
      };

      if (registroDiario) {
        // Si ya existe un registro, agregar solo la actividad usando los datos existentes del día
        const actividadesExistentes = registroDiario.actividades?.map(act => ({
          jobId: act.jobId,
          duracionHoras: act.duracionHoras,
          esExtra: act.esExtra,
          className: act.className,
          descripcion: act.descripcion,
        })) || [];

        const params = {
          fecha: dateString,
          horaEntrada: registroDiario.horaEntrada,
          horaSalida: registroDiario.horaSalida,
          jornada: registroDiario.jornada,
          esDiaLibre: registroDiario.esDiaLibre,
          comentarioEmpleado: registroDiario.comentarioEmpleado,
          actividades: [...actividadesExistentes, actividad],
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      } else {
        // Si no existe registro, validar configuración del día y crear nuevo registro
        if (!validateDayConfig()) return;
        
        // Crear fechas ISO completas para el día seleccionado
        const horaEntrada = new Date(`${dateString}T${dayConfigData.horaEntrada}:00.000Z`);
        const horaSalida = new Date(`${dateString}T${dayConfigData.horaSalida}:00.000Z`);

        const params = {
          fecha: dateString,
          horaEntrada: horaEntrada.toISOString(),
          horaSalida: horaSalida.toISOString(),
          jornada: dayConfigData.jornada,
          esDiaLibre: dayConfigData.esDiaLibre,
          comentarioEmpleado: dayConfigData.comentarioEmpleado,
          actividades: [actividad],
        };

        const updatedRegistro = await RegistroDiarioService.upsert(params);
        setRegistroDiario(updatedRegistro);
      }

      setSnackbar({ open: true, message: 'Actividad guardada correctamente', severity: 'success' });
      handleDrawerClose();
    } catch (error) {
      console.error('Error al guardar actividad:', error);
      const message = (error as Error).message || 'Error al guardar la actividad';
      setSnackbar({ open: true, message, severity: 'error' });
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

  // Calcular horas trabajadas basándose en las actividades
  const workedHours = registroDiario?.actividades?.reduce((total, act) => total + act.duracionHoras, 0) || 0;
  const totalHours = registroDiario ? 9.0 : 0; // 9 horas estándar, podría calcularse desde hora entrada/salida
  const progressPercentage = totalHours > 0 ? (workedHours / totalHours) * 100 : 0;
  
  // Estado del registro diario
  const hasDayRecord = Boolean(registroDiario);
  const dayConfigHasChanges = hasChangesInDayConfig();

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
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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

          <Button
            variant={hasDayRecord ? 'outlined' : 'contained'}
            startIcon={<Settings />}
            onClick={handleDayConfigSubmit}
            size="small"
            color={hasDayRecord ? 'success' : 'primary'}
            sx={{ ml: 1 }}
            disabled={loading || (hasDayRecord && !dayConfigHasChanges)}
          >
            {loading ? 'Guardando...' : hasDayRecord ? 'Actualizar Día' : 'Guardar Día'}
          </Button>
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

      {/* Day info */}
      {registroDiario && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
          <Chip 
            label={`Jornada: ${registroDiario.jornada === 'M' ? 'Mañana' : registroDiario.jornada === 'T' ? 'Tarde' : 'Noche'}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip 
            label={`${registroDiario.horaEntrada.substring(11, 16)} - ${registroDiario.horaSalida.substring(11, 16)}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          {registroDiario.esDiaLibre && (
            <Chip 
              label="Día Libre"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>
      )}

      {/* Welcome message */}
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ mb: 3, textAlign: 'center', fontWeight: 'medium' }}
      >
        ¡Buen día, {user?.nombre}! 👋
      </Typography>

      {/* Day Configuration Section */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
            Configuración del Día Laboral
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {/* Hora de Entrada */}
            <TextField
              fullWidth
              required
              type="time"
              name="horaEntrada"
              label="Hora de Entrada"
              value={dayConfigData.horaEntrada}
              onChange={handleDayConfigInputChange}
              error={!!dayConfigErrors.horaEntrada}
              helperText={dayConfigErrors.horaEntrada}
              InputLabelProps={{ shrink: true }}
              size="small"
            />

            {/* Hora de Salida */}
            <TextField
              fullWidth
              required
              type="time"
              name="horaSalida"
              label="Hora de Salida"
              value={dayConfigData.horaSalida}
              onChange={handleDayConfigInputChange}
              error={!!dayConfigErrors.horaSalida}
              helperText={dayConfigErrors.horaSalida}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {/* Jornada */}
            <FormControl fullWidth size="small">
              <InputLabel>Jornada</InputLabel>
              <Select
                name="jornada"
                value={dayConfigData.jornada}
                onChange={(e) => handleDayConfigInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                label="Jornada"
              >
                <MenuItem value="M">Mañana</MenuItem>
                <MenuItem value="T">Tarde</MenuItem>
                <MenuItem value="N">Noche</MenuItem>
              </Select>
            </FormControl>

            {/* Es Día Libre */}
            <Box sx={{ display: 'flex', alignItems: 'center', height: '40px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="esDiaLibre"
                    checked={dayConfigData.esDiaLibre}
                    onChange={handleDayConfigInputChange}
                    color="primary"
                  />
                }
                label="Día Libre"
              />
            </Box>
          </Box>

          {/* Comentario del Empleado */}
          <TextField
            fullWidth
            multiline
            rows={2}
            name="comentarioEmpleado"
            label="Comentario (opcional)"
            placeholder="Agregar comentarios adicionales..."
            value={dayConfigData.comentarioEmpleado}
            onChange={handleDayConfigInputChange}
            size="small"
          />
        </CardContent>
      </Card>

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

      {/* Activities list or empty state */}
      {registroDiario?.actividades && registroDiario.actividades.length > 0 ? (
        <Stack spacing={2}>
          {registroDiario.actividades.map((actividad, index) => (
            <Card key={actividad.id || index} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 'medium' }}>
                    {actividad.job?.nombre || `Job ID: ${actividad.jobId}`}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip 
                      label={`${actividad.duracionHoras}h`}
                      size="small"
                      color="primary"
                    />
                    {actividad.esExtra && (
                      <Chip 
                        label="Extra"
                        size="small"
                        color="warning"
                      />
                    )}
                  </Stack>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Job:</strong> {actividad.job?.codigo || actividad.jobId}
                </Typography>
                
                {actividad.className && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Class:</strong> {actividad.className}
                  </Typography>
                )}
                
                <Typography variant="body1" color="text.primary">
                  {actividad.descripcion}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
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
            No hay actividades para hoy
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
      )}

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



      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
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