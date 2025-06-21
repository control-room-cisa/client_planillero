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
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";

const SidebarSupervisor = () => {
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
            xs: 12,
            sm: 12,
            md: 12,
            lg: 16,
            xl: 16,
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
            <CreateNewFolderIcon
              sx={{
                fontSize: 30,
                color: isActive("/planillas") ? "#000" : "#000",
              }}
            />
          </ListItemIcon>
          <ListItemText primary="Llenar Planillas" primaryTypographyProps={{
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

export default SidebarSupervisor;
