import * as React from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import type { LayoutOutletCtx } from "../Layout";
import ProrrateoDashboard from "./gestion-prorrateo/ProrrateoDashboard";

const ProrrateoRoute: React.FC = () => {
  const { selectedEmpleado } = useOutletContext<LayoutOutletCtx>();

  if (!selectedEmpleado) {
    return <Navigate to="/contabilidad/prorrateo" replace />;
  }

  return <ProrrateoDashboard empleado={selectedEmpleado} />;
};

export default ProrrateoRoute;
