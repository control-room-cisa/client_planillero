import TareasDiarias from "../pages/planillas/employees/DailyTasksForm";
import Planillero from "../pages/planillas/employees/PlanilleroPage";
import Historial from "../pages/planillas/employees/HistoricalPage";
import Notifications from "../pages/planillas/employees/NotificationsPage";
import HomeResources from "../pages/planillas/human_resources/HomeResourcesPage";
import HistorialHumanResources from "../pages/planillas/human_resources/HistorialResourcesPage";
import NotificationsHumanResources from "../pages/planillas/human_resources/NotificationsResourcesPage";
import EmpresaPage from "../components/human_resources/EmpresaPage";
import HomeSupervisorPage from "../pages/planillas/supervisors/HomeSupervisorPage";
import SupervisorPlanillasPage from "../pages/planillas/supervisors/SupervisorPlanillasPage";
import HumanResourcesPayroll from "../components/human_resources/HumanResourcesPayroll";

export const roleRoutes = {
  Empleado: [
    { path: "/", element: <TareasDiarias />, index: true },
    { path: "planillero", element: <Planillero /> },
    { path: "historial", element: <Historial /> },
    { path: "notificaciones", element: <Notifications /> },
  ],

  Administrador: [
    { path: "/", element: <HomeResources />, index: true },
    { path: "home", element: <HomeResources /> },
    { path: "planillas", element: <EmpresaPage /> },
    { path: "historial", element: <HistorialHumanResources /> },
    { path: "notificaciones", element: <NotificationsHumanResources /> },
    // { path: ":empresa", element: <EmpresaPage /> },
    { path: ":empresa", element: <HumanResourcesPayroll /> },
  ],

  Supervisor: [
    { path: "/", element: <SupervisorPlanillasPage />, index: true },
    { path: "/planillas", element: <TareasDiarias /> },
    { path: "/notificaciones", element: <HomeSupervisorPage /> },
  ],
};
