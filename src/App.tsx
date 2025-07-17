import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import ContabilidadDashboard from './components/contabilidad/ContabilidadDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal - Layout general con protección de autenticación */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          } 
        />

        {/* Ruta específica para contabilidad - Protegida por rol */}
        <Route 
          path="/contabilidad" 
          element={
            <RoleProtectedRoute allowedRoles={[4]} redirectPath="/">
              <ContabilidadDashboard />
            </RoleProtectedRoute>
          } 
        />

        {/* Redirigir cualquier otra ruta a la página principal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
