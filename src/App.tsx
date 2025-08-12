// App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

import Login from "./components/auth/Login";
import Register from "./components/auth/Register";

// Páginas
import DailyTimesheet from "./components/registro-actividades/DailyTimesheet";
import TimesheetReviewSupervisor from "./components/supervisor/TimesheetReviewSupervisor";
import TimesheetReviewRrhh from "./components/rrhh/TimesheetReviewRrhh";
import FeriadosManagement from "./components/rrhh/FeriadosManagement";
import EmpleadosManagement from "./components/rrhh/EmpleadosManagement";
import ContabilidadDashboard from "./components/contabilidad/ContabilidadDashboard";
import TimesheetReviewEmployee from "./components/TimesheetReviewEmployee";
import NominasRoute from "./components/rrhh/NominasRoute";

// Vista "router" para notificaciones según rol
const NotificationsRouter = () => {
  // Colab (rolId=1) ve TimesheetReviewEmployee; otros ven mensaje simple
  return <TimesheetReviewEmployee />;
};

export default function App() {
  return (
    // App.tsx (resumen)
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
            path="registro"
            element={
              <RoleProtectedRoute allowedRoles={[1, 2]}>
                <DailyTimesheet />
              </RoleProtectedRoute>
            }
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
          <Route index element={<Navigate to="registro" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>

  );
}
