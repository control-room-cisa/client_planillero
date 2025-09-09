import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ViewEmployeeApproved from '../ViewEmployeeApproved';
import type { RegistroDiarioData } from '../../dtos/RegistrosDiariosDataDto';

// Mock RegistroDiarioService used by the component
const getByDateMock = vi.fn<[], any>();
vi.mock('../../services/registroDiarioService', () => ({
  default: {
    getByDate: (...args: any[]) => getByDateMock(...(args as any)),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ViewEmployeeApproved', () => {
  test('muestra mensaje cuando no hay registros', async () => {
    getByDateMock.mockResolvedValue(null);
    render(
      <ViewEmployeeApproved
        startDate={new Date('2025-09-01')}
        endDate={new Date('2025-09-01')}
        status="Aprobado"
      />
    );

    await screen.findByText(/no hay registros/i);
  });

  test('filtra por estado "Aprobado" y renderiza registros', async () => {
    const regApproved: RegistroDiarioData = {
      fecha: '2025-09-01',
      horaEntrada: '2025-09-01T08:00:00.000Z',
      horaSalida: '2025-09-01T17:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      aprobacionSupervisor: true,
      actividades: [
        {
          jobId: 1,
          duracionHoras: 8,
          esExtra: false,
          descripcion: 'Trabajo normal',
          horaInicio: '2025-09-01T08:00:00.000Z',
          horaFin: '2025-09-01T17:00:00.000Z',
        },
      ],
    } as any;
    const regPending: RegistroDiarioData = {
      fecha: '2025-09-02',
      horaEntrada: '2025-09-02T08:00:00.000Z',
      horaSalida: '2025-09-02T17:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      aprobacionSupervisor: null as any,
      actividades: [],
    } as any;

    // Respond per date parameter
    getByDateMock.mockImplementation(async (fecha: string) => {
      if (fecha === '2025-09-01') return regApproved;
      if (fecha === '2025-09-02') return regPending;
      return null;
    });

    render(
      <ViewEmployeeApproved
        startDate={new Date('2025-09-01')}
        endDate={new Date('2025-09-02')}
        status="Aprobado"
      />
    );

    // Only the approved day should render
    await screen.findByText(/resumen de horas/i);
    expect(screen.getAllByText(/resumen de horas/i).length).toBe(1);
    // And the chip 'Aprobado'
    await screen.findByText(/aprobado/i);
  });

  test('filtra por estado "Pendiente" y muestra chip Pendiente', async () => {
    const regPending: RegistroDiarioData = {
      fecha: '2025-09-03',
      horaEntrada: '2025-09-03T08:00:00.000Z',
      horaSalida: '2025-09-03T17:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      aprobacionSupervisor: null as any,
      actividades: [],
    } as any;
    const regRejected: RegistroDiarioData = {
      fecha: '2025-09-04',
      horaEntrada: '2025-09-04T08:00:00.000Z',
      horaSalida: '2025-09-04T17:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      aprobacionSupervisor: false,
      actividades: [],
    } as any;

    getByDateMock.mockImplementation(async (fecha: string) => {
      if (fecha === '2025-09-03') return regPending;
      if (fecha === '2025-09-04') return regRejected;
      return null;
    });

    render(
      <ViewEmployeeApproved
        startDate={new Date('2025-09-03')}
        endDate={new Date('2025-09-04')}
        status="Pendiente"
      />
    );

    await screen.findByText(/resumen de horas/i);
    expect(screen.queryByText(/rechazado/i)).toBeNull();
    expect(await screen.findByText(/pendiente/i)).toBeInTheDocument();
  });

  test('muestra resumen de horas: normales, extras y total', async () => {
    const data: RegistroDiarioData = {
      fecha: '2025-09-05',
      horaEntrada: '2025-09-05T08:00:00.000Z',
      horaSalida: '2025-09-05T17:00:00.000Z',
      esDiaLibre: false,
      esHoraCorrida: false,
      aprobacionSupervisor: true,
      actividades: [
        { jobId: 1, duracionHoras: 8, esExtra: false, descripcion: 'N', horaInicio: '2025-09-05T08:00:00.000Z', horaFin: '2025-09-05T17:00:00.000Z' },
        { jobId: 2, duracionHoras: 2, esExtra: true, descripcion: 'E', horaInicio: '2025-09-05T17:00:00.000Z', horaFin: '2025-09-05T19:00:00.000Z' },
      ],
    } as any;

    getByDateMock.mockResolvedValueOnce(data);

    render(
      <ViewEmployeeApproved
        startDate={new Date('2025-09-05')}
        endDate={new Date('2025-09-05')}
        status="Aprobado"
      />
    );

    // Resumen visible
    const resumen = await screen.findByText(/resumen de horas/i);
    expect(resumen).toBeInTheDocument();
    // Chips con valores (puede haber duplicados en otros lugares, tomamos al menos uno)
    expect((await screen.findAllByText('8.00h')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('2.00h')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('10.00h')).length).toBeGreaterThan(0);
  });
});
