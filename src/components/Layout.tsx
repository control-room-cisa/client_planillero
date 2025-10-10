// components/Layout.tsx
import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box,
  CssBaseline,
  Typography,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
} from "@mui/material";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PostAddIcon from "@mui/icons-material/PostAdd";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventIcon from "@mui/icons-material/Event";
import PeopleIcon from "@mui/icons-material/People";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNotificationCount } from "../hooks/useNotificationCount";
import type { Empleado } from "../services/empleadoService";

const drawerWidth = 240;
const settings = ["Cerrar Sesión"];

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<{
  open?: boolean;
}>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

// 👉 Tipo auxiliar para el índice de empleados usado por NominasDashboard
export type EmpleadoIndexItem = {
  id: number;
  codigo?: string | null;
  nombreCompleto: string;
};

// 👉 Exporta el tipo del contexto para usar en hijos (Nominas, etc.)
export type LayoutOutletCtx = {
  selectedEmpleado: Empleado | null;
  setSelectedEmpleado: (e: Empleado | null) => void;

  // NUEVO: índice de empleados y su setter (para navegación en Nóminas)
  empleadosIndex: EmpleadoIndexItem[];
  setEmpleadosIndex: (list: EmpleadoIndexItem[]) => void;
};

export default function Layout() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { count: notificationCount } = useNotificationCount();
  const [open, setOpen] = React.useState(false);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 600);

  const [selectedEmpleado, _setSelectedEmpleado] =
    React.useState<Empleado | null>(null);
  const [empleadosIndex, _setEmpleadosIndex] = React.useState<
    EmpleadoIndexItem[]
  >([]);

  const navigate = useNavigate();
  const location = useLocation();

  // Memorizar la fecha actual para evitar re-renders innecesarios
  const todayDateString = React.useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  // ===== Detectar cambios de tamaño de pantalla
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 600;
      setIsMobile(mobile);
      // Cerrar drawer en móviles cuando se redimensiona
      if (mobile && open) {
        setOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  // ===== Ruta inicial por rol cuando se entra a "/"
  React.useEffect(() => {
    if (location.pathname !== "/") return;
    if (!user?.rolId) return; // Esperar a que el usuario esté cargado

    if (user.rolId === 3) {
      navigate("/rrhh/planillas", { replace: true });
    } else if (user.rolId === 4) {
      navigate("/contabilidad", { replace: true });
    } else if (user.rolId === 1 || user.rolId === 2) {
      // rol 1 (colaborador) o supervisor 2 -> redirigir con fecha actual
      navigate(`/registro-actividades/${todayDateString}`, { replace: true });
    }
  }, [location.pathname, navigate, user?.rolId, todayDateString]);

  // ===== Menú por rol → path
  const navItems = React.useMemo(() => {
    // Contabilidad (rol 4)
    if (user?.rolId === 4) {
      return [
        {
          id: "contabilidad",
          text: "Panel de Contabilidad",
          icon: <DashboardIcon />,
          path: "/contabilidad",
        },
        {
          id: "supervision",
          text: "Vista Supervisor",
          icon: <FindInPageIcon />,
          path: "/supervision/planillas",
        },
        {
          id: "prorrateo",
          text: "Prorrateo",
          icon: <AccountBalanceIcon />,
          path: "/contabilidad/prorrateo",
        },
      ];
    }

    // RRHH (rol 3)  -> sin notificaciones
    if (user?.rolId === 3) {
      return [
        {
          id: "rrhh-planillas",
          text: "Revisión de Actividades Diarias",
          icon: <FindInPageIcon />,
          path: "/rrhh/planillas",
        },
        {
          id: "colaboradores",
          text: "Gestión de Colaboradores",
          icon: <PeopleIcon />,
          path: "/rrhh/colaboradores",
        },
        {
          id: "feriados",
          text: "Gestión de Feriados",
          icon: <EventIcon />,
          path: "/rrhh/feriados",
        },
      ];
    }

    // Supervisor (rol 2) -> sin notificaciones
    if (user?.rolId === 2) {
      return [
        {
          id: "registro",
          text: "Nuevo Registro Diario",
          icon: <PostAddIcon />,
          path: `/registro-actividades/${todayDateString}`,
        },
        {
          id: "supervision",
          text: "Revisión de Actividades Diarias",
          icon: <FindInPageIcon />,
          path: "/supervision/planillas",
        },
      ];
    }

    // Colaborador (rol 1) -> con notificaciones
    return [
      {
        id: "registro",
        text: "Nuevo Registro Diario",
        icon: <PostAddIcon />,
        path: `/registro-actividades/${todayDateString}`,
      },
      {
        id: "notificaciones",
        text: "Notificaciones",
        icon: (
          <Badge badgeContent={notificationCount} color="error">
            <NotificationsIcon />
          </Badge>
        ),
        path: "/notificaciones",
      },
    ];
  }, [user?.rolId, notificationCount, todayDateString]);

  const handleOpenUserMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorElUser(e.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleLogout = () => {
    logout();
    handleCloseUserMenu();
    navigate("/login");
  };

  const isItemSelected = (path: string) => location.pathname === path;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setOpen(true)}
            edge="start"
            sx={{ marginRight: 5, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Planillero
          </Typography>
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title={`${user?.nombre} ${user?.apellido}`}>
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={`${user?.nombre} ${user?.apellido}`}>
                  {user?.nombre?.[0]}
                  {user?.apellido?.[0]}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem
                  key={setting}
                  onClick={
                    setting === "Cerrar Sesión"
                      ? handleLogout
                      : handleCloseUserMenu
                  }
                >
                  <Typography textAlign="center">{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <MuiDrawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          width: isMobile ? drawerWidth : open ? drawerWidth : 64,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? drawerWidth : open ? drawerWidth : 64,
            boxSizing: "border-box",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: "hidden",
          },
        }}
      >
        <DrawerHeader>
          <IconButton onClick={() => setOpen(false)}>
            {theme.direction === "rtl" ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  // Cerrar drawer en móviles después de navegar
                  if (isMobile) {
                    setOpen(false);
                  }
                }}
                selected={isItemSelected(item.path)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? "initial" : "center",
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ opacity: open ? 1 : 0 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </MuiDrawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <DrawerHeader />
        {/* 👉 Outlet con contexto extendido */}
        <Outlet
          context={
            {
              selectedEmpleado,
              setSelectedEmpleado: (e: Empleado | null) =>
                _setSelectedEmpleado(e),
              empleadosIndex,
              setEmpleadosIndex: (list: EmpleadoIndexItem[]) =>
                _setEmpleadosIndex(list),
            } satisfies LayoutOutletCtx
          }
        />
      </Box>
    </Box>
  );
}
