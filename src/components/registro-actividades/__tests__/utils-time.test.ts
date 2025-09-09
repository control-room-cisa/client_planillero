import {
  timeToMinutes,
  getBoundsFromHHMM,
  normalizeToDaySpan,
  intervalOverlap,
  lunchOverlapInRange,
  buildISO,
  errorOutsideRange,
  computeHoraFinError,
  computeHorasInvertidas,
  computeHorasActividadForDisplayNum,
  computeHorasActividadForDisplay,
  isActivityOutsideRange,
} from '../utils-time';
import type { Activity } from '../types';

describe('utils-time: core conversions', () => {
  test('timeToMinutes converts HH:mm to minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('07:30')).toBe(450);
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  test('getBoundsFromHHMM detects midnight crossing', () => {
    const day = getBoundsFromHHMM('08:00', '17:00');
    expect(day.dayStart).toBe(480);
    expect(day.dayEnd).toBe(1020);
    expect(day.crossesMidnight).toBe(false);

    const night = getBoundsFromHHMM('20:00', '04:00');
    expect(night.dayStart).toBe(1200);
    // 04:00 next day => 240 + 1440
    expect(night.dayEnd).toBe(1680);
    expect(night.crossesMidnight).toBe(true);
  });

  test('normalizeToDaySpan adjusts values before start when crossing midnight', () => {
    const { dayStart, crossesMidnight } = getBoundsFromHHMM('20:00', '04:00');
    // 03:00 is 180; should add 1440
    expect(normalizeToDaySpan(180, dayStart, crossesMidnight)).toBe(1620);

    // 21:00 is after start already
    expect(normalizeToDaySpan(1260, dayStart, crossesMidnight)).toBe(1260);
  });
});

describe('utils-time: overlaps and lunch', () => {
  test('intervalOverlap basic', () => {
    expect(intervalOverlap(0, 10, 5, 15)).toBe(5);
    expect(intervalOverlap(0, 10, 10, 20)).toBe(0);
    expect(intervalOverlap(5, 15, 0, 10)).toBe(5);
  });

  test('lunchOverlapInRange against 12:00-13:00', () => {
    // Fully before lunch
    expect(lunchOverlapInRange(600, 660)).toBe(0);
    // Partial overlap 12:30-12:45
    expect(lunchOverlapInRange(750, 765)).toBe(15);
    // Full hour overlap
    expect(lunchOverlapInRange(600, 900)).toBe(60);
  });
});

describe('utils-time: buildISO', () => {
  test('buildISO produces UTC Z string for given date + HH:mm', () => {
    const base = new Date('2024-01-15T10:20:00Z');
    const iso = buildISO(base, '08:30');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T08:30:00\.000Z$/);
  });
});

describe('utils-time: validations', () => {
  test('errorOutsideRange returns message when outside range (day shift)', () => {
    expect(errorOutsideRange('inicio', '07:00', '08:00', '17:00')).toContain('fuera del horario');
    expect(errorOutsideRange('fin', '18:00', '08:00', '17:00')).toContain('fuera del horario');
    // inside
    expect(errorOutsideRange('inicio', '09:00', '08:00', '17:00')).toBe('');
  });

  test('errorOutsideRange considers midnight crossing', () => {
    // Shift 20:00-04:00. 03:00 belongs to next day but valid
    expect(errorOutsideRange('fin', '03:00', '20:00', '04:00')).toBe('');
    // 12:00 should be outside that window
    expect(errorOutsideRange('inicio', '12:00', '20:00', '04:00')).toContain('fuera del horario');
  });

  test('computeHoraFinError compares order only when not crossing midnight', () => {
    // Same-day: fin must be after inicio
    expect(computeHoraFinError('08:00', '09:00', '06:00', '18:00')).toBe('La hora final debe ser posterior a la inicial');
    expect(computeHoraFinError('10:00', '09:00', '06:00', '18:00')).toBe('');

    // Crossing midnight: 01:00 next day with inicio 23:00 is allowed
    expect(computeHoraFinError('01:00', '23:00', '20:00', '04:00')).toBe('');
  });
});

describe('utils-time: hours calculations', () => {
  test('computeHorasInvertidas without lunch when esHoraCorrida', () => {
    const h = computeHorasInvertidas('08:00', '12:00', true, '08:00', '17:00');
    expect(h).toBe('4.00');
  });

  test('computeHorasInvertidas subtracts full lunch overlap when not hora corrida', () => {
    // 11:30-13:30 => 2 hours minus 60 min lunch => 1.0
    const h = computeHorasInvertidas('11:30', '13:30', false, '08:00', '17:00');
    expect(h).toBe('1.00');
  });

  test('computeHorasInvertidas across midnight', () => {
    // 22:00-02:00 => 4 hours, lunch window 12-13 does not overlap
    const h = computeHorasInvertidas('22:00', '02:00', false, '20:00', '04:00');
    expect(h).toBe('4.00');
  });

  test('computeHorasActividadForDisplay and Num match and round', () => {
    const act: Activity = {
      descripcion: 'Trabajo',
      horaInicio: '2024-05-10T11:30:00.000Z',
      horaFin: '2024-05-10T13:30:00.000Z',
      duracionHoras: 0,
      jobId: 1,
      esExtra: false,
    };
    const num = computeHorasActividadForDisplayNum(act, false, '08:00', '17:00');
    expect(num).toBe(1);
    const disp = computeHorasActividadForDisplay(act, false, '08:00', '17:00');
    expect(disp).toBe('1');
  });

  test('isActivityOutsideRange detects outside correctly', () => {
    const inside: Activity = {
      descripcion: 'Inside',
      horaInicio: '2024-05-10T08:00:00.000Z',
      horaFin: '2024-05-10T16:00:00.000Z',
      duracionHoras: 0,
      jobId: 1,
      esExtra: false,
    };
    const outside: Activity = { ...inside, horaInicio: '2024-05-10T07:00:00.000Z' };
    expect(isActivityOutsideRange(inside, '08:00', '17:00')).toBe(false);
    expect(isActivityOutsideRange(outside, '08:00', '17:00')).toBe(true);

    // Crossing midnight window: 20:00-04:00. Activity 03:00-03:30 next day is inside
    const nightAct: Activity = {
      descripcion: 'Night',
      horaInicio: '2024-05-10T03:00:00.000Z',
      horaFin: '2024-05-10T03:30:00.000Z',
      duracionHoras: 0,
      jobId: 1,
      esExtra: false,
    };
    expect(isActivityOutsideRange(nightAct, '20:00', '04:00')).toBe(false);
  });
});
