// import React from "react";
import type { ReactNode } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import Auth from "./auth/Auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

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

  // Si está autenticado, mostrar el contenido protegido
  return <>{children}</>;
}
