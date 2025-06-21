// src/components/employees/Layout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box, Drawer, useMediaQuery } from "@mui/material";
import Sidebar from "./SidebarEmployees";
import SidebarHumanResources from "../human_resources/SidebarHumanResources";
import SidebarSupervisor from "../supervisors/SidebarSupervisor";
import Header from "./Header";
import SessionManager from "../employees/SessionManager";
import { useUser } from "../../context/UserContext";

const Layout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:900px)");
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  useEffect(() => {
    const navigationEntries = performance.getEntriesByType("navigation");
    const isReload = navigationEntries[0]?.type === "reload";

    if (isReload && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return <Box p={4}>Cargando…</Box>;
  }
  console.log("user", user.rol);

  const SidebarComponent =
    user?.rol === "Administrador"
      ? SidebarHumanResources
      : user?.rol === "Supervisor"
      ? SidebarSupervisor
      : Sidebar;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <SessionManager />
      {!isMobile && <SidebarComponent />}

      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={toggleDrawer}
          ModalProps={{ keepMounted: true }}
        >
          <SidebarComponent />
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Header onMenuClick={toggleDrawer} />
        <Box sx={{ padding: 2, flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
