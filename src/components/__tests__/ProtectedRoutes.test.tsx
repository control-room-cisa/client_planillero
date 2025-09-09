import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import RoleProtectedRoute from '../RoleProtectedRoute';

// Mock Auth component to a simple marker
vi.mock('../auth/Auth', () => ({
  __esModule: true,
  default: () => <div>AuthComponent</div>,
}));

// Mock useAuth per test scenario
const useAuthMock = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: () => useAuthMock(),
}));

// Mock Navigate to render a marker when redirecting
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>REDIRECT:{to}</div>,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  test('muestra loader cuando loading', () => {
    useAuthMock.mockReturnValue({ loading: true, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Contenido</div>
      </ProtectedRoute>
    );
    // CircularProgress has role progressbar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('muestra Auth cuando no autenticado', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Contenido</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('AuthComponent')).toBeInTheDocument();
  });

  test('muestra contenido cuando autenticado', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true });
    render(
      <ProtectedRoute>
        <div>Contenido</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });
});

describe('RoleProtectedRoute', () => {
  test('redirige si rol no permitido', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true, user: { rolId: 3 } });
    render(
      <RoleProtectedRoute allowedRoles={[1, 2]} redirectPath="/home">
        <div>Secreto</div>
      </RoleProtectedRoute>
    );
    expect(screen.getByText('REDIRECT:/home')).toBeInTheDocument();
  });

  test('muestra contenido si rol permitido', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true, user: { rolId: 2 } });
    render(
      <RoleProtectedRoute allowedRoles={[2]}>
        <div>Secreto</div>
      </RoleProtectedRoute>
    );
    expect(screen.getByText('Secreto')).toBeInTheDocument();
  });

  test('muestra Auth si no autenticado', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: false });
    render(
      <RoleProtectedRoute allowedRoles={[1]}>
        <div>Secreto</div>
      </RoleProtectedRoute>
    );
    expect(screen.getByText('AuthComponent')).toBeInTheDocument();
  });
});

