import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiResponse } from '../../dtos/apiResponseDto';

// Mock axios so that api.ts creates our mocked instance
vi.mock('axios', () => {
  const get = vi.fn();
  const post = vi.fn();
  const patch = vi.fn();
  const instance = { get, post, patch, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } } as any;
  return {
    default: { create: () => instance },
    __mocks: { get, post, patch },
  };
});

import * as axiosModule from 'axios';
import RegistroDiarioService from '../registroDiarioService';

const apiMocks = (axiosModule as any).__mocks as { get: any; post: any; patch: any };

beforeEach(() => {
  apiMocks.get.mockReset();
  apiMocks.post.mockReset();
  apiMocks.patch.mockReset();
});

describe('RegistroDiarioService', () => {
  it('getByDate returns data on 200', async () => {
    const payload: ApiResponse<any> = { success: true, message: 'ok', data: { id: 1 } };
    apiMocks.get.mockResolvedValue({ data: payload });
    const res = await RegistroDiarioService.getByDate('2025-09-04');
    expect(res).toEqual({ id: 1 });
    expect(apiMocks.get).toHaveBeenCalledWith('/registrodiario', { params: { fecha: '2025-09-04' } });
  });

  it('getByDate returns null on 404', async () => {
    apiMocks.get.mockRejectedValue({ response: { status: 404 } });
    const res = await RegistroDiarioService.getByDate('2025-09-04');
    expect(res).toBeNull();
  });

  it('getByDate throws on other errors', async () => {
    apiMocks.get.mockRejectedValue({ response: { status: 500 } });
    await expect(RegistroDiarioService.getByDate('2025-09-04')).rejects.toBeTruthy();
  });

  it('upsert posts payload and returns data', async () => {
    const payload: ApiResponse<any> = { success: true, message: 'ok', data: { id: 2 } };
    apiMocks.post.mockResolvedValue({ data: payload });
    const res = await RegistroDiarioService.upsert({
      fecha: '2025-09-04',
      horaEntrada: '2025-09-04T07:00:00.000Z',
      horaSalida: '2025-09-04T19:00:00.000Z',
    } as any);
    expect(res).toEqual({ id: 2 });
    expect(apiMocks.post).toHaveBeenCalled();
  });
});
