import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

import UserLogin from "./pages/users/UserLogin";
import UserRegister from "./pages/users/UserRegister";
import PrivateRoute from "./components/employees/PrivateRoute";
import Layout from "./components/employees/Layout";
import { DateRangeProvider } from "./context/DateRangeContext";
import { useUser } from "./context/UserContext";
import { roleRoutes } from "./routes/roleRoutes";

function App() {
  const { user } = useUser();

  return (
    <DateRangeProvider>
      <Router>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<UserRegister />} />

          {/* Rutas privadas */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            {roleRoutes[user?.rol]?.map(({ path, element, index }) => (
              <Route
                key={path}
                path={index ? undefined : path}
                index={index}
                element={element}
              />
            ))}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </Router>
    </DateRangeProvider>
  );
}

export default App;