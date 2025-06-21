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
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const SidebarHumanResources = () => {
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
        fontWeight="bold"
        sx={{
          mb: 3,
          mt: 1,
          textAlign: "center",
          fontSize: {
            xs: 12, // Extra-small screens
            sm: 12, // Small screens
            md: 12, // Medium screens
            lg: 16, // Large screens
            xl: 16, // Extra-large screens
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
              sx={{ fontSize: 30, color: isActive("/") ? "#000" : "#000" }}
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
          to="/planillas"
          sx={{
            backgroundColor: isActive("/planillas") ? "#D1E9FD" : "transparent",
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
            <ListAltIcon
              sx={{
                fontSize: 30,
                color: isActive("/planillas") ? "#000" : "#000",
              }}
            />
          </ListItemIcon>
          <ListItemText primary="Ver Planillas" primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }} />
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
                color: isActive("/calendario") ? "#000000" : "#000000",
              }}
            />
          </ListItemIcon>
          <ListItemText primary="Calendario" primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }} />
            
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
                color: isActive("/notificaciones") ? "#000" : "#000",
              }}
            />
          </ListItemIcon>
          <ListItemText primary="Notificaciones" primaryTypographyProps={{
              sx: { fontSize: 15, color: "black" },
            }} />
        </ListItemButton>
      </List>
    </Box>
  );
};

export default SidebarHumanResources;
