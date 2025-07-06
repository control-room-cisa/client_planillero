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
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  Add,
  AccessTime,
} from '@mui/icons-material';

const DailyTimesheet: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentDate, setCurrentDate] = useState(new Date());

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
        sx={{ mb: 3, textAlign: 'center' }}
      >
        {formatDate(currentDate)}
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
        >
          Agregar Actividad
        </Button>
      </Box>

      {/* Floating Action Button for mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default DailyTimesheet; 