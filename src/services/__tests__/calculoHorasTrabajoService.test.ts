import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiResponse } from '../../dtos/apiResponseDto';

vi.mock('axios', () => {
  const get = vi.fn();
  const instance = { get, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } } as any;
  return { default: { create: () => instance }, __mocks: { get } };
});

import * as axiosModule from 'axios';
import CalculoHorasTrabajoService from '../calculoHorasTrabajoService';

const apiMocks = (axiosModule as any).__mocks as { get: any };

beforeEach(() => {
  apiMocks.get.mockReset();
});

describe('CalculoHorasTrabajoService', () => {
  it('getHorarioTrabajo returns data and calls correct URL', async () => {
    const payload: ApiResponse<any> = {
      success: true,
      message: 'ok',
      data: { tipoHorario: 'H1', horarioTrabajo: { inicio: '07:00', fin: '19:00' } },
    };
    apiMocks.get.mockResolvedValue({ data: payload });
    const res = await CalculoHorasTrabajoService.getHorarioTrabajo(1, '2025-09-04');
    expect(res.tipoHorario).toBe('H1');
    expect(apiMocks.get).toHaveBeenCalledWith('/calculo-horas/1/horario/2025-09-04');
  });

  it('getConteoHoras forwards params and returns data', async () => {
    const payload: ApiResponse<any> = {
      success: true,
      message: 'ok',
      data: { cantidadHoras: { normal: 8, p25: 1, p50: 0, p75: 0, p100: 0, libre: 0, almuerzo: 1 } },
    };
    apiMocks.get.mockResolvedValue({ data: payload });
    const res = await CalculoHorasTrabajoService.getConteoHoras(1, '2025-09-01', '2025-09-30');
    expect(res.cantidadHoras.normal).toBe(8);
    expect(apiMocks.get).toHaveBeenCalledWith('/calculo-horas/1/conteo-horas', { params: { fechaInicio: '2025-09-01', fechaFin: '2025-09-30' } });
  });

  it('calcularDesgloseIncidencias handles zero hours (H1)', () => {
    const conteo = {
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      empleadoId: '1',
      cantidadHoras: { normal: 0, p25: 0, p50: 0, p75: 0, p100: 0, libre: 0, almuerzo: 0 },
      totalHorasLaborables: 160,
    } as any;
    const d = CalculoHorasTrabajoService.calcularDesgloseIncidencias(conteo);
    expect(d.totalHoras).toBe(0);
    expect(d.horasNormales).toBe(160);
    expect(d.diferencia).toBe(-160);
    expect(d.normal.porcentaje).toBe('0%');
    expect(d.overtime25.porcentaje).toBe('0%');
    expect(d.overtime50.porcentaje).toBe('0%');
    expect(d.overtime75.porcentaje).toBe('0%');
    expect(d.overtime100.porcentaje).toBe('0%');
  });

  it('calcularDesgloseIncidencias computes percentages for mixed overtime (H1)', () => {
    const conteo = {
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      empleadoId: '1',
      cantidadHoras: { normal: 8, p25: 2, p50: 1.5, p75: 0.5, p100: 1, libre: 0, almuerzo: 1 },
      totalHorasLaborables: 8,
    } as any;
    const d = CalculoHorasTrabajoService.calcularDesgloseIncidencias(conteo);
    // Total trabajadas = 8 + 2 + 1.5 + 0.5 + 1 = 13
    expect(d.totalHoras).toBeCloseTo(13);
    expect(d.normal.horas).toBe(8);
    expect(d.overtime25.horas).toBe(2);
    expect(d.overtime50.horas).toBe(1.5);
    expect(d.overtime75.horas).toBe(0.5);
    expect(d.overtime100.horas).toBe(1);
    expect(d.normal.porcentaje).toBe('61.5%'); // 8/13 = 61.538...
    expect(d.overtime25.porcentaje).toBe('15.4%'); // 2/13
    expect(d.overtime50.porcentaje).toBe('11.5%'); // 1.5/13
    expect(d.overtime75.porcentaje).toBe('3.8%'); // 0.5/13
    expect(d.overtime100.porcentaje).toBe('7.7%'); // 1/13
  });

  it('calcularDesgloseIncidencias 100% p25', () => {
    const conteo = {
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      empleadoId: '1',
      cantidadHoras: { normal: 0, p25: 10, p50: 0, p75: 0, p100: 0, libre: 0, almuerzo: 0 },
    } as any;
    const d = CalculoHorasTrabajoService.calcularDesgloseIncidencias(conteo);
    expect(d.totalHoras).toBe(10);
    expect(d.overtime25.porcentaje).toBe('100.0%');
    expect(d.normal.porcentaje).toBe('0.0%');
  });

  it('calcularDesgloseIncidencias 100% p50', () => {
    const conteo = {
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      empleadoId: '1',
      cantidadHoras: { normal: 0, p25: 0, p50: 10, p75: 0, p100: 0, libre: 0, almuerzo: 0 },
    } as any;
    const d = CalculoHorasTrabajoService.calcularDesgloseIncidencias(conteo);
    expect(d.totalHoras).toBe(10);
    expect(d.overtime50.porcentaje).toBe('100.0%');
  });

  it('calcularDesgloseIncidencias 100% p75', () => {
    const conteo = {
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      empleadoId: '1',
      cantidadHoras: { normal: 0, p25: 0, p50: 0, p75: 8, p100: 0, libre: 0, almuerzo: 0 },
    } as any;
    const d = CalculoHorasTrabajoService.calcularDesgloseIncidencias(conteo);
    expect(d.totalHoras).toBe(8);
    expect(d.overtime75.porcentaje).toBe('100.0%');
  });

  it('calcularDesgloseIncidencias 100% p100', () => {
    const conteo = {
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      empleadoId: '1',
      cantidadHoras: { normal: 0, p25: 0, p50: 0, p75: 0, p100: 5, libre: 0, almuerzo: 0 },
    } as any;
    const d = CalculoHorasTrabajoService.calcularDesgloseIncidencias(conteo);
    expect(d.totalHoras).toBe(5);
    expect(d.overtime100.porcentaje).toBe('100.0%');
  });

  it('getResumenHorasTrabajo compone conteo y desglose (H1)', async () => {
    const payload: ApiResponse<any> = {
      success: true,
      message: 'ok',
      data: {
        fechaInicio: '2025-09-01',
        fechaFin: '2025-09-30',
        empleadoId: '1',
        cantidadHoras: { normal: 80, p25: 10, p50: 5, p75: 0, p100: 0, libre: 0, almuerzo: 10 },
        totalHorasLaborables: 160,
      },
    };
    apiMocks.get.mockResolvedValue({ data: payload });
    const res = await CalculoHorasTrabajoService.getResumenHorasTrabajo(1, '2025-09-01', '2025-09-30');
    expect(res.conteoHoras.cantidadHoras.normal).toBe(80);
    expect(res.desgloseIncidencias.totalHoras).toBe(95);
    expect(res.desgloseIncidencias.normal.porcentaje).toBe('84.2%'); // 80/95
  });
});
