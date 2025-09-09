import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../../../theme';
import DailyTimesheet from '../DailyTimesheet';

// Auth mock
vi.mock('../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: () => ({ user: { id: 1, nombre: 'Test' } }),
}));

// Rules mock: ensure visibility/enabling
vi.mock('../../../hooks/useHorarioRules', () => ({
  __esModule: true,
  default: () => ({
    utils: {
      isFieldEnabled: () => true,
      isFieldVisible: () => true,
      getFieldConfig: () => ({}),
      processApiDefaults: (prev: any) => prev,
      calculateNormalHours: () => 8,
      calculateLunchHours: () => 1,
    },
  }),
}));

// Validator mock
vi.mock('../../../utils/horarioValidations', () => ({
  __esModule: true,
  HorarioValidator: {
    validateByTipo: () => ({
      horaInicio: '07:00',
      horaFin: '19:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: true,
      mostrarNombreFestivo: false,
      tipoHorario: 'H1',
    }),
    getProgressPercentage: () => 0,
    getHorasFaltantesMessage: () => '',
  },
}));

// Services mocks (default)
vi.mock('../../../services/registroDiarioService', () => ({
  __esModule: true,
  default: {
    getByDate: vi.fn(async () => null),
    upsert: vi.fn(),
  },
}));

vi.mock('../../../services/calculoHorasTrabajoService', () => ({
  __esModule: true,
  default: {
    getHorarioTrabajo: vi.fn(async () => ({
      tipoHorario: 'H1',
      fecha: '2025-09-04',
      empleadoId: '1',
      horarioTrabajo: { inicio: '07:00', fin: '19:00' },
      incluyeAlmuerzo: true,
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      cantidadHorasLaborables: 8,
    })),
  },
}));

// JobService mock
vi.mock('../../../services/jobService', () => ({
  __esModule: true,
  default: { getAll: vi.fn() },
}));

// Stub MUI icons
vi.mock('@mui/icons-material', async () => {
  const React = await import('react');
  const Dummy = (props: any) => React.createElement('span', props);
  return {
    ChevronLeft: Dummy,
    ChevronRight: Dummy,
    CalendarToday: Dummy,
    Add: Dummy,
    AccessTime: Dummy,
    Close: Dummy,
    Settings: Dummy,
    Edit: Dummy,
    Delete: Dummy,
  } as any;
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {ui}
    </ThemeProvider>
  );
}

describe('DailyTimesheet', () => {
  it('renderiza campos de hora de entrada y salida', async () => {
    const calc = (await import('../../../services/calculoHorasTrabajoService')).default as any;
    // Para turnos diurnos ajustables, usar tipoHorario H2
    calc.getHorarioTrabajo.mockResolvedValueOnce({
      tipoHorario: 'H2',
      fecha: '2025-09-04',
      empleadoId: '1',
      horarioTrabajo: { inicio: '07:00', fin: '19:00' },
      incluyeAlmuerzo: true,
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      cantidadHorasLaborables: 8,
    });
    renderWithProviders(<DailyTimesheet />);
    expect(await screen.findByLabelText(/hora de entrada/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/hora de salida/i)).toBeInTheDocument();
  });

  it('redondea la hora de entrada a múltiples de 15 minutos', async () => {
    const calc = (await import('../../../services/calculoHorasTrabajoService')).default as any;
    calc.getHorarioTrabajo.mockResolvedValueOnce({
      tipoHorario: 'H2',
      fecha: '2025-09-04',
      empleadoId: '1',
      horarioTrabajo: { inicio: '07:00', fin: '19:00' },
      incluyeAlmuerzo: true,
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      cantidadHorasLaborables: 11,
    });
    renderWithProviders(<DailyTimesheet />);
    const entrada = await screen.findByLabelText(/hora de entrada/i);
    await waitFor(() => expect(entrada).toBeEnabled());
    fireEvent.change(entrada, { target: { value: '07:08', name: 'horaEntrada' } });
    await waitFor(() => expect((entrada as HTMLInputElement).value).toBe('07:15'));
  });

  it('ajusta hora de salida ±1h al activar/desactivar Hora Corrida (turno diurno)', async () => {
    const calc2 = (await import('../../../services/calculoHorasTrabajoService')).default as any;
    // Forzar tipoHorario H2 para ajustar hora de salida en turno diurno
    calc2.getHorarioTrabajo.mockResolvedValueOnce({
      tipoHorario: 'H2',
      fecha: '2025-09-04',
      empleadoId: '1',
      horarioTrabajo: { inicio: '07:00', fin: '19:00' },
      incluyeAlmuerzo: true,
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      cantidadHorasLaborables: 8,
    });
    renderWithProviders(<DailyTimesheet />);
    const salida = await screen.findByLabelText(/hora de salida/i);
    await waitFor(() => expect((salida as HTMLInputElement).value).toBe('19:00'));
    const horaCorrida = await screen.findByRole('checkbox', { name: /hora corrida/i });
    fireEvent.click(horaCorrida);
    await waitFor(() => expect((salida as HTMLInputElement).value).toBe('18:00'));
    fireEvent.click(horaCorrida);
    await waitFor(() => expect((salida as HTMLInputElement).value).toBe('19:00'));
  });

  it('no ajusta hora de salida en turno nocturno (cruza medianoche)', async () => {
    const calc = (await import('../../../services/calculoHorasTrabajoService')).default as any;
    calc.getHorarioTrabajo.mockResolvedValueOnce({
      tipoHorario: 'H1',
      fecha: '2025-09-04',
      empleadoId: '1',
      horarioTrabajo: { inicio: '19:00', fin: '07:00' },
      incluyeAlmuerzo: true,
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      cantidadHorasLaborables: 12,
    });
    renderWithProviders(<DailyTimesheet />);
    const salida = await screen.findByLabelText(/hora de salida/i);
    const horaCorrida = await screen.findByRole('checkbox', { name: /hora corrida/i });
    fireEvent.click(horaCorrida);
    await waitFor(() => expect((salida as HTMLInputElement).value).toBe('07:00'));
  });

  it('bloquea guardar día si hay actividades fuera del rango', async () => {
    const registro = (await import('../../../services/registroDiarioService')).default as any;
    registro.getByDate.mockResolvedValueOnce({
      id: 1,
      horaEntrada: '2025-09-04T07:00:00.000Z',
      horaSalida: '2025-09-04T19:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      jornada: 'D',
      actividades: [
        { horaInicio: '2025-09-04T06:30:00.000Z', horaFin: '2025-09-04T08:00:00.000Z', jobId: 1, duracionHoras: 1.5 },
      ],
    });
    renderWithProviders(<DailyTimesheet />);
    const entrada = await screen.findByLabelText(/hora de entrada/i);
    await waitFor(() => expect(entrada).toBeEnabled());
    fireEvent.change(entrada, { target: { value: '08:00', name: 'horaEntrada' } });
    const boton = await screen.findByRole('button', { name: /(Guardar|Actualizar) D.*/i });
    await userEvent.click(boton);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/fuera del nuevo rango/i);
  });

  it('ordena actividades: normales primero; extras por hora; con hora antes que sin hora', async () => {
    const registro = (await import('../../../services/registroDiarioService')).default as any;
    registro.getByDate.mockResolvedValueOnce({
      id: 1,
      horaEntrada: '2025-09-04T07:00:00.000Z',
      horaSalida: '2025-09-04T19:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      jornada: 'D',
      actividades: [
        { jobId: 2, duracionHoras: 1, esExtra: true, descripcion: 'E-09', horaInicio: '2025-09-04T09:00:00.000Z', horaFin: '2025-09-04T10:00:00.000Z' },
        { jobId: 1, duracionHoras: 2, esExtra: false, descripcion: 'N-1' },
        { jobId: 3, duracionHoras: 1, esExtra: true, descripcion: 'E-08', horaInicio: '2025-09-04T08:00:00.000Z', horaFin: '2025-09-04T09:00:00.000Z' },
        { jobId: 4, duracionHoras: 1, esExtra: false, descripcion: 'N-4' },
      ],
    });
    renderWithProviders(<DailyTimesheet />);
    const headers = await screen.findAllByRole('heading', { level: 3 });
    const texts = headers.map((h) => h.textContent || '');
    expect(texts[0]).toMatch(/Job ID:\s*1/);
    expect(texts[1]).toMatch(/Job ID:\s*4/);
    expect(texts[2]).toMatch(/Job ID:\s*3/);
    expect(texts[3]).toMatch(/Job ID:\s*2/);
  });

  it('rechaza solapamiento de actividades en el Drawer (hora extra)', async () => {
    const registro = (await import('../../../services/registroDiarioService')).default as any;
    const JobService = (await import('../../../services/jobService')).default as any;
    // Puede llamarse múltiples veces; devolvemos siempre la misma lista
    JobService.getAll.mockResolvedValue([
      { id: 10, codigo: 'J-10', nombre: 'Job 10', activo: true },
    ]);

    registro.getByDate.mockResolvedValueOnce({
      id: 1,
      horaEntrada: '2025-09-04T07:00:00.000Z',
      horaSalida: '2025-09-04T19:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      jornada: 'D',
      actividades: [
        { horaInicio: '2025-09-04T08:00:00.000Z', horaFin: '2025-09-04T09:00:00.000Z', jobId: 99, duracionHoras: 1 },
      ],
    });

    renderWithProviders(<DailyTimesheet />);
    const botonNueva = await screen.findByRole('button', { name: /nueva actividad|agregar actividad/i });
    fireEvent.click(botonNueva);

    const jobInput = await screen.findByRole('combobox', { name: /job/i });
    await userEvent.click(jobInput);
    await userEvent.type(jobInput, 'J-10');
    const opcion = await screen.findByRole('option', { name: /J-10 - Job 10/i });
    await userEvent.click(opcion);

    const chkExtra = await screen.findByRole('checkbox', { name: /hora extra/i });
    fireEvent.click(chkExtra);

    const inicio = await screen.findByLabelText(/hora inicio actividad/i);
    const fin = await screen.findByLabelText(/hora fin actividad/i);
    fireEvent.change(inicio, { target: { value: '08:30', name: 'horaInicio' } });
    fireEvent.change(fin, { target: { value: '09:30', name: 'horaFin' } });

    const guardar = await screen.findByRole('button', { name: /guardar$/i });
    fireEvent.click(guardar);
    const overlaps = await screen.findAllByText(/se solapa con otra actividad/i);
    expect(overlaps.length).toBeGreaterThan(0);
  }, 15000);
});
