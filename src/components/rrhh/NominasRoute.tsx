// src/routes/NominasRoute.tsx (o donde prefieras)
import * as React from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import type { LayoutOutletCtx } from "../Layout";
import NominasDashboard from "./gestion-empleados/NominasDashboard";

const NominasRoute: React.FC = () => {
  const { selectedEmpleado } = useOutletContext<LayoutOutletCtx>();

  // Si entran directo sin seleccionar empleado, mándalos a la lista
  if (!selectedEmpleado) {
    return <Navigate to="/rrhh/colaboradores" replace />;
  }

  return <NominasDashboard empleado={selectedEmpleado} />;
};

export default NominasRoute;
