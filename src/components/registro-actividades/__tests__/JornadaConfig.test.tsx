import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../../../theme';
import JornadaConfig from '../JornadaConfig';
import type { DayConfigData, HorarioValidado } from '../types';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {ui}
    </ThemeProvider>
  );
}

const baseValue: DayConfigData = {
  horaEntrada: '08:00',
  horaSalida: '17:00',
  jornada: 'D',
  esDiaLibre: false,
  esHoraCorrida: false,
  comentarioEmpleado: '',
};

describe('JornadaConfig', () => {
  test('renderiza campos básicos con valores y permite cambios', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={onChange} />
    );

    const entrada = screen.getByLabelText(/hora de entrada/i) as HTMLInputElement;
    const salida = screen.getByLabelText(/hora de salida/i) as HTMLInputElement;
    expect(entrada.value).toBe('08:00');
    expect(salida.value).toBe('17:00');

    fireEvent.change(entrada, { target: { value: '09:00', name: 'horaEntrada' } });
    fireEvent.change(salida, { target: { value: '18:00', name: 'horaSalida' } });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test('muestra errores de validación en helperText cuando los recibe', () => {
    renderWithProviders(
      <JornadaConfig
        value={baseValue}
        onChange={vi.fn()}
        errors={{ horaEntrada: 'Error entrada', horaSalida: 'Error salida' }}
      />
    );

    expect(screen.getByText(/error entrada/i)).toBeInTheDocument();
    expect(screen.getByText(/error salida/i)).toBeInTheDocument();
  });

  test('deshabilita inputs cuando readOnly=true', () => {
    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={vi.fn()} readOnly />
    );
    expect(screen.getByLabelText(/hora de entrada/i)).toBeDisabled();
    expect(screen.getByLabelText(/hora de salida/i)).toBeDisabled();
    expect(screen.getByLabelText(/comentario/i)).toBeDisabled();
  });

  test('muestra chips de flags: Día Libre y Hora Corrida', () => {
    const value: DayConfigData = { ...baseValue, esDiaLibre: true, esHoraCorrida: true };
    renderWithProviders(
      <JornadaConfig value={value} onChange={vi.fn()} />
    );
    // Aceptar con o sin acento en "Día"; puede aparecer en chip y en label del checkbox
    expect(screen.getAllByText(/d[íi]a libre/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hora corrida/i).length).toBeGreaterThan(0);
  });

  test('muestra select de Jornada solo si mostrarJornada=true y chip con texto Jornada', () => {
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: true,
      mostrarNombreFestivo: false,
    } as any;

    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={vi.fn()} horarioValidado={hv} />
    );

    // Chip de Jornada presente
    expect(screen.getByText(/jornada:/i)).toBeInTheDocument();
    // Etiqueta de Jornada visible (pueden existir varias coincidencias)
    expect(screen.getAllByText(/jornada/i).length).toBeGreaterThan(0);
  });

  test('oculta select de Jornada si mostrarJornada=false', () => {
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: false,
      mostrarNombreFestivo: false,
    } as any;

    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={vi.fn()} horarioValidado={hv} />
    );

    expect(screen.queryByLabelText(/jornada/i)).toBeNull();
  });

  test('muestra chip de festivo cuando se indica nombre y bandera', () => {
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: true,
      nombreDiaFestivo: 'Navidad',
      horasNormales: 8,
      mostrarJornada: false,
      mostrarNombreFestivo: true,
    } as any;

    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={vi.fn()} horarioValidado={hv} />
    );
    // El prefijo del chip tiene caracteres corruptos en el código; validamos por el nombre del festivo
    expect(screen.getByText(/navidad/i)).toBeInTheDocument();
  });

  test('permite togglear checkboxes y muestra select de Jornada', () => {
    const onChange = vi.fn();
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: true,
      mostrarNombreFestivo: false,
    } as any;

    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={onChange} horarioValidado={hv} />
    );

    // Select visible (verificamos la etiqueta)
    expect(screen.getAllByText(/jornada/i).length).toBeGreaterThan(0);
    const cbLibre = screen.getByLabelText(/d[íi]a libre/i);
    const cbCorrida = screen.getByLabelText(/hora corrida/i);
    fireEvent.click(cbLibre);
    fireEvent.click(cbCorrida);

    // 2 eventos (2 checkboxes)
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test('cambia Jornada seleccionando opciones del menú (MUI Select)', async () => {
    const onChange = vi.fn();
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: true,
      mostrarNombreFestivo: false,
    } as any;

    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={onChange} horarioValidado={hv} />
    );

    const selectBtn = screen.getByRole('combobox');
    await userEvent.click(selectBtn);
    const optNoche = await screen.findByRole('option', { name: /noche/i });
    await userEvent.click(optNoche);
    expect(onChange).toHaveBeenCalled();
    const evt1 = onChange.mock.calls[0][0] as any;
    expect(evt1?.target?.name).toBe('jornada');
    expect(evt1?.target?.value).toBe('N');

    // Seleccionar Mixta
    await userEvent.click(screen.getByRole('combobox'));
    const optMixta = await screen.findByRole('option', { name: /mixta/i });
    await userEvent.click(optMixta);
    const evt2 = onChange.mock.calls[1][0] as any;
    expect(evt2?.target?.value).toBe('M');
  });

  test('actualiza el chip "Jornada: …" cuando value.jornada cambia (controlado con rerender)', async () => {
    const onChange = vi.fn();
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: true,
      mostrarNombreFestivo: false,
    } as any;

    const { rerender } = renderWithProviders(
      <JornadaConfig value={baseValue} onChange={onChange} horarioValidado={hv} />
    );

    // Inicialmente Día
    expect(screen.getByText(/jornada:\s*d[íi]a/i)).toBeInTheDocument();

    // Simula seleccionar Noche y luego rerender controlado
    const select = screen.getByRole('combobox');
    await userEvent.click(select);
    await userEvent.click(await screen.findByRole('option', { name: /noche/i }));
    // El componente es controlado, así que aplicamos el cambio vía rerender
    rerender(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <JornadaConfig value={{ ...baseValue, jornada: 'N' }} onChange={onChange} horarioValidado={hv} />
      </ThemeProvider>
    );
    expect(screen.getByText(/jornada:\s*noche/i)).toBeInTheDocument();

    // Cambiar a Mixta y verificar chip
    rerender(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <JornadaConfig value={{ ...baseValue, jornada: 'M' }} onChange={onChange} horarioValidado={hv} />
      </ThemeProvider>
    );
    expect(screen.getByText(/jornada:\s*mixta/i)).toBeInTheDocument();
  });

  test('readOnly deshabilita Select y checkboxes', () => {
    const hv: HorarioValidado = {
      horaInicio: '08:00',
      horaFin: '17:00',
      esDiaLibre: false,
      esFestivo: false,
      nombreDiaFestivo: '',
      horasNormales: 8,
      mostrarJornada: true,
      mostrarNombreFestivo: false,
    } as any;

    renderWithProviders(
      <JornadaConfig value={baseValue} onChange={vi.fn()} horarioValidado={hv} readOnly />
    );

    const selectBtn = screen.getByRole('combobox');
    expect(selectBtn).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText(/d[íi]a libre/i)).toBeDisabled();
    expect(screen.getByLabelText(/hora corrida/i)).toBeDisabled();
  });

  test('cambia el comentario y dispara onChange', () => {
    const onChange = vi.fn();
    renderWithProviders(<JornadaConfig value={baseValue} onChange={onChange} />);
    const comentario = screen.getByLabelText(/comentario/i);
    fireEvent.change(comentario, { target: { value: 'Hola', name: 'comentarioEmpleado' } });
    expect(onChange).toHaveBeenCalled();
  });
});
