import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

interface Employee {
  id: number;
  nombre: string;
  apellido: string;
  departamento: string;
}

const TimesheetReview: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Datos simulados de empleados del mismo departamento
  const employees: Employee[] = [
    { id: 1, nombre: 'Fulano', apellido: 'Pérez', departamento: 'Desarrollo' },
    { id: 2, nombre: 'María', apellido: 'López', departamento: 'Desarrollo' },
    { id: 3, nombre: 'Carlos', apellido: 'Rodríguez', departamento: 'Desarrollo' },
  ];

  const filteredEmployees = employees.filter(employee =>
    `${employee.nombre} ${employee.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: 'background.default' }}>
      {/* Panel izquierdo - Filtros */}
      <Paper
        sx={{
          width: 350,
          borderRadius: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            Filtros
          </Typography>
        </Box>

        {/* Buscar Empleado */}
        <Box sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 2 }}>
            Buscar Empleado
          </Typography>
          <TextField
            fullWidth
            placeholder="Nombre del empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Lista de empleados */}
          <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
            {filteredEmployees.map((employee) => (
              <React.Fragment key={employee.id}>
                <ListItem sx={{ p: 0 }}>
                  <ListItemButton
                    onClick={() => handleEmployeeSelect(employee)}
                    selected={selectedEmployee?.id === employee.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        '&:hover': {
                          bgcolor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {employee.nombre} {employee.apellido}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {employee.departamento}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {employee.id !== filteredEmployees[filteredEmployees.length - 1].id && (
                  <Divider sx={{ my: 0.5 }} />
                )}
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Filtro por Estado */}
        <Box sx={{ p: 3, pt: 0 }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 2 }}>
            Estado
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="Pendiente">Pendiente</MenuItem>
              <MenuItem value="Aprobado">Aprobado</MenuItem>
              <MenuItem value="Rechazado">Rechazado</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Panel derecho - Contenido principal */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Revisión Planillas Supervisor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mostrar Planillas mismo Departamento
          </Typography>
        </Box>

        {/* Contenido */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          {selectedEmployee ? (
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2rem',
                }}
              >
                {selectedEmployee.nombre[0]}{selectedEmployee.apellido[0]}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Planillas de {selectedEmployee.nombre} {selectedEmployee.apellido}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aquí se mostrarán las planillas del empleado seleccionado
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'grey.300',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: '2rem' }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Selecciona un Empleado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Busca y selecciona un empleado para revisar sus planillas
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TimesheetReview; 