import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Guards / Layout
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import RoleProtectedRoute from "../components/RoleProtectedRoute";
import { Roles } from "../enums/roles";

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
const FeriadosManagement = React.lazy(
  () => import("../components/rrhh/FeriadosManagement")
);
const PlanillaAccesoRevisionManagement = React.lazy(
  () => import("../components/rrhh/PlanillaAccesoRevisionManagement")
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
const NominasManagement = React.lazy(
  () => import("../components/rrhh/NominasManagement")
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
        {/* Registro (EMPLEADO + SUPERVISOR) */}
        <Route
          path="registro-actividades/:fecha?"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.EMPLEADO, Roles.SUPERVISOR]}>
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
            <RoleProtectedRoute allowedRoles={[Roles.SUPERVISOR, Roles.CONTABILIDAD]}>
              <SupervisorManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="supervision/planillas/detalle"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.SUPERVISOR, Roles.CONTABILIDAD]}>
              <SupervisorRoute />
            </RoleProtectedRoute>
          }
        />

        {/* RRHH */}
        <Route
          path="rrhh/colaboradores"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.RRHH]}>
              <EmpleadosManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/feriados"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.RRHH]}>
              <FeriadosManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/accesos-planilla"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.RRHH]}>
              <PlanillaAccesoRevisionManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/nominas"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.RRHH]}>
              <NominasRoute />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="rrhh/nominas-gestion"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.RRHH]}>
              <NominasManagement />
            </RoleProtectedRoute>
          }
        />

        {/* Contabilidad */}
        <Route
          path="contabilidad"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.CONTABILIDAD]}>
              <ContabilidadDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="contabilidad/prorrateo"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.CONTABILIDAD]}>
              <ProrrateoManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="contabilidad/prorrateo/detalle"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.CONTABILIDAD]}>
              <ProrrateoRoute />
            </RoleProtectedRoute>
          }
        />

        {/* Notificaciones (solo EMPLEADO) */}
        <Route
          path="notificaciones"
          element={
            <RoleProtectedRoute allowedRoles={[Roles.EMPLEADO]}>
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
