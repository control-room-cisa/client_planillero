import { useState } from 'react';
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
    Button,
    Chip,
    Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { es } from 'date-fns/locale';

interface Props {
    empleado: {
        nombre: string;
        apellido: string;
        codigo?: string;
    };
}

const PlanillaDetallePreview = ({ empleado }: Props) => {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Simulamos datos mock
    const registrosMock = [
        {
            id: 1,
            fecha: '2025-07-09',
            horaEntrada: '07:00',
            horaSalida: '17:00',
            actividades: [
                { id: 1, descripcion: 'Desarrollo de proyecto', horas: 4, job: 'Developer', class: 'Normal' },
                { id: 2, descripcion: 'Reunión', horas: 2, job: 'Analyst', class: 'Extra' },
            ]
        },
        {
            id: 2,
            fecha: '2025-07-10',
            horaEntrada: '07:00',
            horaSalida: '17:00',
            actividades: [
                { id: 3, descripcion: 'Monitoreo', horas: 5, job: 'Operator', class: 'Normal' },
            ]
        }
    ];

    // Formateo de fechas
    const formatDate = (date: Date | null) =>
        date ? date.toLocaleDateString('es-ES') : '---';

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box sx={{ p: 3 }}>
                {/* Encabezado del Empleado */}
                <Paper
                    elevation={1}
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        width: 780
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Columna izquierda: Nombre */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="subtitle2">Nombre</Typography>
                            <Typography variant="body1">
                                {empleado.nombre} {empleado.apellido}{' '}
                                {empleado.codigo ? `(Código: ${empleado.codigo})` : ''}
                            </Typography>
                        </Box>

                        {/* Columna derecha: Periodo y fechas */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2">Periodo</Typography>
                                <Typography variant="body2">
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <DatePicker
                                    sx={{ width: 180 }}
                                    label="Fecha inicio"
                                    value={startDate}
                                    onChange={(newDate) => setStartDate(newDate)}
                                    slotProps={{ textField: { size: 'small' } }}
                                />
                                <DatePicker
                                    sx={{ width: 180 }}
                                    label="Fecha fin"
                                    value={endDate}
                                    onChange={(newDate) => setEndDate(newDate)}
                                    slotProps={{ textField: { size: 'small' } }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Paper>


                {/* Lista de planillas simuladas */}
                {registrosMock.map((registro) => (
                    <Paper key={registro.id} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                        <Box sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={6} flexWrap="wrap">
                                <Typography variant="subtitle2">
                                    Fecha: {registro.fecha}
                                </Typography>
                                <Typography variant="subtitle2">
                                    Hora entrada: {registro.horaEntrada}
                                </Typography>
                                <Typography variant="subtitle2">
                                    Hora salida: {registro.horaSalida}
                                </Typography>
                            </Stack>
                        </Box>


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
                                    <TableCell>Class</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {registro.actividades.map((act) => (
                                    <TableRow key={act.id}>
                                        <TableCell>{act.descripcion}</TableCell>
                                        <TableCell>
                                            <Chip label={`${act.horas}h`} size="small" color="primary" />
                                        </TableCell>
                                        <TableCell>{act.job}</TableCell>
                                        <TableCell>{act.class}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Divider sx={{ my: 2 }} />

                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 2
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mt: 2,
                                    width: '100%',
                                    flexWrap: 'wrap',
                                    gap: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', gap: 4 }}>
                                    <Typography variant="body2">
                                        Horas normales: ---
                                    </Typography>
                                    <Typography variant="body2">
                                        Horas extras: ---
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
                                    <Button variant="outlined" color="success">Aprobar</Button>
                                    <Button variant="outlined" color="error">Rechazar</Button>
                                </Box>
                            </Box>

                        </Box>
                    </Paper>
                ))}
            </Box>
        </LocalizationProvider>
    );
};

export default PlanillaDetallePreview;
