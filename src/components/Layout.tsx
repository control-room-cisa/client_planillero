import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import PostAddIcon from "@mui/icons-material/PostAdd";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventIcon from "@mui/icons-material/Event";
import PeopleIcon from "@mui/icons-material/People";
import { Avatar, Menu, MenuItem, Tooltip } from "@mui/material";
import DailyTimesheet from "./registro-actividades/DailyTimesheet";
import { useAuth } from "../hooks/useAuth";
import TimesheetReviewSupervisor from "./supervisor/TimesheetReviewSupervisor";
import TimesheetReviewRrhh from "./rrhh/TimesheetReviewRrhh";
import FeriadosManagement from "./rrhh/FeriadosManagement";
import ContabilidadDashboard from "./contabilidad/ContabilidadDashboard";
import TimesheetReviewEmployee from "./TimesheetReviewEmployee";
import EmpleadosManagement from "./rrhh/EmpleadosManagement";

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
})<{ open?: boolean }>(({ theme, open }) => ({
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

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})<{ open?: boolean }>(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
    "& .MuiDrawer-paper": {
      width: drawerWidth,
      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      overflowX: "hidden",
    },
  }),
  ...(!open && {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up("sm")]: {
      width: `calc(${theme.spacing(8)} + 1px)`,
    },
    "& .MuiDrawer-paper": {
      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      overflowX: "hidden",
      width: `calc(${theme.spacing(7)} + 1px)`,
      [theme.breakpoints.up("sm")]: {
        width: `calc(${theme.spacing(8)} + 1px)`,
      },
    },
  }),
}));

export default function MiniDrawer() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  // Establecer vista inicial según el rol del usuario
  const getInitialView = () => {
    if (user?.rolId === 3) return "review-timesheets-rrhh";
    if (user?.rolId === 4) return "contabilidad-dashboard";
    return "daily-register";
  };
  const [selectedView, setSelectedView] = React.useState(getInitialView());

  // Configurar elementos de navegación según el rol del usuario
  const getNavItems = () => {
    const baseItems = [
      {
        id: "daily-register",
        text: "Nuevo Registro Diario",
        icon: <PostAddIcon />,
      },
      {
        id: "notifications",
        text: "Notificaciones",
        icon: <NotificationsIcon />,
      },
    ];

    // Solo agregar "Revisión Planillas" para supervisores (rolId = 2)
    if (user?.rolId === 2) {
      baseItems.splice(1, 0, {
        id: "review-timesheets-supervisor",
        text: "Revisión Planillas Supervisor",
        icon: <FindInPageIcon />,
      });
    }

    // Para RRHH: quitar registro diario y agregar revisión de planillas y gestión de feriados
    if (user?.rolId === 3) {
      // Eliminar "Nuevo Registro Diario" para RRHH
      baseItems.shift();

      // Agregar revisión de planillas al principio
      baseItems.unshift({
        id: "review-timesheets-rrhh",
        text: "Revisión Planillas RRHH",
        icon: <FindInPageIcon />,
      });

      // Agregar gestión de colaboradores
      baseItems.push({
        id: "colaboradores-management",
        text: "Gestión de Colaboradores",
        icon: <PeopleIcon />,
      });

      // Agregar gestión de feriados
      baseItems.push({
        id: "feriados-management",
        text: "Gestión de Feriados",
        icon: <EventIcon />,
      });
    }

    // Para Contabilidad: solo mostrar dashboard de contabilidad
    if (user?.rolId === 4) {
      return [
        {
          id: "contabilidad-dashboard",
          text: "Dashboard Contabilidad",
          icon: <FindInPageIcon />,
        },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    logout();
    handleCloseUserMenu();
  };

  const handleNavItemClick = (itemId: string) => {
    setSelectedView(itemId);
  };

  const renderContent = () => {
    // Si es RRHH y está intentando ver daily-register, redirigir a revisión de planillas
    if (user?.rolId === 3 && selectedView === "daily-register") {
      return <TimesheetReviewRrhh />;
    }

    // Si es Contabilidad y está intentando ver otra cosa que no sea su dashboard
    if (user?.rolId === 4 && selectedView !== "contabilidad-dashboard") {
      return <ContabilidadDashboard />;
    }

    switch (selectedView) {
      case "daily-register":
        return <DailyTimesheet />;
      case "review-timesheets-supervisor":
        return <TimesheetReviewSupervisor />;
      case "review-timesheets-rrhh":
        return <TimesheetReviewRrhh />;
      case "colaboradores-management":
        return <EmpleadosManagement />;
      case "feriados-management":
        return <FeriadosManagement />;
      case "contabilidad-dashboard":
        return <ContabilidadDashboard />;
      case "notifications":
        if (user?.rolId === 1) {
          // Solo colaboradores ven el componente especial
          return <TimesheetReviewEmployee />;
        }
        // El resto ve el mensaje por defecto
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Notificaciones
            </Typography>
            <Typography variant="body1">
              Aquí verás todas tus notificaciones.
            </Typography>
          </Box>
        );
      default:
        // Si es RRHH, la vista por defecto es revisión de planillas
        if (user?.rolId === 3) {
          return <TimesheetReviewRrhh />;
        }
        // Si es Contabilidad, la vista por defecto es su dashboard
        if (user?.rolId === 4) {
          return <ContabilidadDashboard />;
        }
        return <DailyTimesheet />;
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: "none" }),
            }}
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
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
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
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
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
                onClick={() => handleNavItemClick(item.id)}
                selected={selectedView === item.id}
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
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <DrawerHeader />
        {renderContent()}
      </Box>
    </Box>
  );
}
