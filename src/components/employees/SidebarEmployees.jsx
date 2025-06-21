import React from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import AddBoxIcon from "@mui/icons-material/AddBox";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <Box
      sx={{
        width: 250,
        minHeight: "100vh",
        backgroundColor: "#F7FBFF",
        padding: 2,
      }}
    >
      <Typography
        fontSize={18}
        fontWeight="bold"
        sx={{
          mb: 3,
          mt: 1,
          textAlign: "center",
          fontSize: {
            xs: 14,
            sm: 14,
            md: 14,
            lg: 16,
            xl: 18,
          },
        }}
      >
        SISTEMA PLANILLERO
      </Typography>
      <Divider />
      <List>
        <ListItemButton
          component={Link}
          to="/"
          sx={{
            backgroundColor: isActive("/") ? "#D1E9FD" : "transparent",
            "&:hover": {
              backgroundColor: "#D1E9FD",
            },
            "&.active": {
              backgroundColor: "#1976d2",
              "& .MuiListItemIcon-root": {
                color: "#FFFFFF",
              },
              "& .MuiTypography-root": {
                color: "#FFFFFF",
              },
            },
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ListItemIcon>
            <HomeIcon
              sx={{
                fontSize: 30,
                color: isActive("/") ? "#000000" : "#000000",
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary="Inicio"
            primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/planillero"
          sx={{
            backgroundColor: isActive("/planillero")
              ? "#D1E9FD"
              : "transparent",
            "&:hover": {
              backgroundColor: "#D1E9FD",
            },
            "&.active": {
              backgroundColor: "#1976d2",
              "& .MuiListItemIcon-root": {
                color: "#FFFFFF",
              },
              "& .MuiTypography-root": {
                color: "#FFFFFF",
              },
            },
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ListItemIcon>
            <AddBoxIcon
              sx={{
                fontSize: 30,
                color: isActive("/planillero") ? "#000000" : "#000000",
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary="Planillas diarias"
            primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/historial"
          sx={{
            backgroundColor: isActive("/historial") ? "#D1E9FD" : "transparent",
            "&:hover": {
              backgroundColor: "#D1E9FD",
            },
            "&.active": {
              backgroundColor: "#1976d2",
              "& .MuiListItemIcon-root": {
                color: "#FFFFFF",
              },
              "& .MuiTypography-root": {
                color: "#FFFFFF",
              },
            },
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ListItemIcon>
            <CalendarMonthIcon
              sx={{
                fontSize: 30,
                color: isActive("/historial") ? "#000000" : "#000000",
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary="Calendario planillas"
            primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/notificaciones"
          sx={{
            backgroundColor: isActive("/notificaciones")
              ? "#D1E9FD"
              : "transparent",
            "&:hover": {
              backgroundColor: "#D1E9FD",
            },
            "&.active": {
              backgroundColor: "#1976d2",
              "& .MuiListItemIcon-root": {
                color: "#FFFFFF",
              },
              "& .MuiTypography-root": {
                color: "#FFFFFF",
              },
            },
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ListItemIcon>
            <MarkEmailUnreadIcon
              sx={{
                fontSize: 30,
                color: isActive("/notificaciones") ? "#000000" : "#000000",
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary="Notificaciones"
            primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }}
          />
        </ListItemButton>
      </List>
    </Box>
  );
};

export default Sidebar;
