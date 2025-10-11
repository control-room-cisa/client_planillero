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
const SupervisorManagement = React.lazy(
  () => import("../components/supervisor/SupervisorManagement")
);
const SupervisorRoute = React.lazy(
  () => import("../components/supervisor/SupervisorRoute")
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
const ProrrateoManagement = React.lazy(
  () => import("../components/contabilidad/ProrrateoManagement")
);
const ProrrateoRoute = React.lazy(
  () => import("../components/contabilidad/ProrrateoRoute")
);
const NotificationsEmployee = React.lazy(
  () => import("../components/NotificationsEmployee")
);
const NominasRoute = React.lazy(
  () => import("../components/rrhh/NominasRoute")
);

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
            <RoleProtectedRoute allowedRoles={[2, 4]}>
              <SupervisorManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="supervision/planillas/detalle"
          element={
            <RoleProtectedRoute allowedRoles={[2, 4]}>
              <SupervisorRoute />
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
        <Route
          path="contabilidad/prorrateo"
          element={
            <RoleProtectedRoute allowedRoles={[4]}>
              <ProrrateoManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="contabilidad/prorrateo/detalle"
          element={
            <RoleProtectedRoute allowedRoles={[4]}>
              <ProrrateoRoute />
            </RoleProtectedRoute>
          }
        />

        {/* Notificaciones (solo colaboradores) */}
        <Route
          path="notificaciones"
          element={
            <RoleProtectedRoute allowedRoles={[1]}>
              <NotificationsEmployee />
            </RoleProtectedRoute>
          }
        />

        {/* Fallback dentro de Layout */}
        <Route
          index
          element={
            <Navigate
              to={`registro-actividades/${
                new Date().toISOString().split("T")[0]
              }`}
              replace
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
