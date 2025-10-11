import * as React from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import type { LayoutOutletCtx } from "../Layout";
import TimesheetReviewSupervisor from "./TimesheetReviewSupervisor";

const SupervisorRoute: React.FC = () => {
  const { selectedEmpleado } = useOutletContext<LayoutOutletCtx>();

  if (!selectedEmpleado) {
    return <Navigate to="/supervision/planillas" replace />;
  }

  return <TimesheetReviewSupervisor empleado={selectedEmpleado} />;
};

export default SupervisorRoute;

