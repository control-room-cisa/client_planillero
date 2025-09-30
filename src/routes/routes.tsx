import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Guards / Layout
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import RoleProtectedRoute from "../components/RoleProtectedRoute";

// Lazy pages (code-splitting)
const Login = React.lazy(() => import("../components/auth/Login"));
const Register = React.lazy(() => import("../components/auth/Register"));

const DailyTimesheet = React.lazy(
  () => import("../components/registro-actividades/DailyTimesheet")
);
const TimesheetReviewSupervisor = React.lazy(
  () => import("../components/supervisor/TimesheetReviewSupervisor")
);
const TimesheetReviewRrhh = React.lazy(
  () => import("../components/rrhh/TimesheetReviewRrhh")
);
const FeriadosManagement = React.lazy(
  () => import("../components/rrhh/FeriadosManagement")
);
const EmpleadosManagement = React.lazy(
  () => import("../components/rrhh/EmpleadosManagement")
);
const ContabilidadDashboard = React.lazy(
  () => import("../components/contabilidad/ContabilidadDashboard")
);
const TimesheetReviewEmployee = React.lazy(
  () => import("../components/TimesheetReviewEmployee")
);
const NominasRoute = React.lazy(
  () => import("../components/rrhh/NominasRoute")
);

// Vista "router" para notificaciones según rol (Colaborador = 1)
const NotificationsRouter: React.FC = () => {
  return <TimesheetReviewEmployee />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Privadas (bajo Layout) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Registro (colab + supervisor) */}
        <Route
          path="registro-actividades/:fecha?"
          element={
            <RoleProtectedRoute allowedRoles={[1, 2]}>
              <DailyTimesheet />
            </RoleProtectedRoute>
          }
        />
        {/* Redirección de /registro a /registro-actividades */}
        <Route
          path="registro"
          element={<Navigate to="registro-actividades" replace />}
        />

        {/* Supervisor */}
        <Route
          path="supervision/planillas"
          element={
            <RoleProtectedRoute allowedRoles={[2]}>
              <TimesheetReviewSupervisor />
            </RoleProtectedRoute>
          }
        />

        {/* RRHH */}
        <Route
          path="rrhh/planillas"
          element={
            <RoleProtectedRoute allowedRoles={[3]}>
              <TimesheetReviewRrhh />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/colaboradores"
          element={
            <RoleProtectedRoute allowedRoles={[3]}>
              <EmpleadosManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/feriados"
          element={
            <RoleProtectedRoute allowedRoles={[3]}>
              <FeriadosManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/nominas"
          element={
            <RoleProtectedRoute allowedRoles={[3]}>
              <NominasRoute />
            </RoleProtectedRoute>
          }
        />

        {/* Contabilidad */}
        <Route
          path="contabilidad"
          element={
            <RoleProtectedRoute allowedRoles={[4]}>
              <ContabilidadDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Notificaciones (router por rol) */}
        <Route
          path="notificaciones"
          element={
            <RoleProtectedRoute allowedRoles={[1]}>
              <NotificationsRouter />
            </RoleProtectedRoute>
          }
        />

        {/* Fallback dentro de Layout */}
        <Route index element={<Navigate to="registro-actividades" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
