
import { Box, Typography } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import NotificationsEmployee from "./NotificationsEmployee";

export default function NotificationsRouter() {
  const { user } = useAuth();

  switch (user?.rolId) {
    case 1: return <NotificationsEmployee />;     // Colaborador
    default:
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h5">Notificaciones</Typography>
          <Typography>No hay notificaciones disponibles.</Typography>
        </Box>
      );
  }
}
