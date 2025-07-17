import React from "react";
import type { ReactNode } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import Auth from "./auth/Auth";
import { Navigate } from "react-router-dom";

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: number[];
  redirectPath?: string;
}

export default function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  redirectPath = "/"
}: RoleProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Si no está autenticado, mostrar auth (login/register)
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Si está autenticado pero no tiene el rol permitido, redirigir
  if (!user || !allowedRoles.includes(user.rolId)) {
    return <Navigate to={redirectPath} replace />;
  }

  // Si está autenticado y tiene el rol permitido, mostrar el contenido
  return <>{children}</>;
} 