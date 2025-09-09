import { describe, it, expect } from 'vitest';
import { DefaultRules } from '../DefaultRules';
import { H1Rules } from '../H1Rules';
import { H2Rules } from '../H2Rules';

const apiData = {
  tipoHorario: 'H1',
  horarioTrabajo: { inicio: '07:00', fin: '19:00' },
  cantidadHorasLaborables: 11,
  esDiaLibre: false,
  esFestivo: false,
  nombreDiaFestivo: '',
};

describe('Horario Rules', () => {
  it('DefaultRules.calculateNormalHours with/without hora corrida', () => {
    const form = { horaEntrada: '07:00', horaSalida: '19:00', esHoraCorrida: false };
    expect(DefaultRules.config.calculateNormalHours(form, undefined)).toBe(11);
    form.esHoraCorrida = true;
    expect(DefaultRules.config.calculateNormalHours(form, undefined)).toBe(12);
  });

  it('DefaultRules.processApiDefaults applies inicio/fin from API when missing', () => {
    const next = DefaultRules.config.processApiDefaults({ horaEntrada: '', horaSalida: '' }, apiData, false);
    expect(next.horaEntrada).toBe('07:00');
    expect(next.horaSalida).toBe('19:00');
  });

  it('H1Rules.calculateNormalHours mirrors Default with lunch deduction', () => {
    const form = { horaEntrada: '07:00', horaSalida: '19:00', esHoraCorrida: false };
    expect(H1Rules.config.calculateNormalHours(form, undefined)).toBe(11);
  });

  it('H1Rules.processApiDefaults respects hasExisting for defaults', () => {
    const withoutExisting = H1Rules.config.processApiDefaults({ horaEntrada: '', horaSalida: '' }, apiData, false);
    expect(withoutExisting.horaEntrada).toBe('07:00');
    expect(withoutExisting.jornada).toBe('D');
    const withExisting = H1Rules.config.processApiDefaults({ horaEntrada: '', horaSalida: '' }, apiData, true);
    // con datos existentes no impone jornada por defecto
    expect(withExisting.jornada).toBeUndefined();
  });

  it('H2Rules.calculateNormalHours no lunch deduction and special N Tuesday rule', () => {
    const form = { horaEntrada: '07:00', horaSalida: '19:00', jornada: 'D' };
    expect(H2Rules.config.calculateNormalHours(form, undefined, { now: new Date('2025-09-03T00:00:00Z') })).toBe(12);
    // Tuesday (getDay() === 2) and jornada N => 6h per special rule
    const tue = new Date('2025-09-02T12:00:00Z');
    expect(H2Rules.config.calculateNormalHours({ ...form, jornada: 'N' }, undefined, { now: tue })).toBe(6);
  });
});
