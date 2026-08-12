
import { Box, Typography } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import NotificationsEmployee from "./NotificationsEmployee";
import { Roles } from "../enums/roles";
import { hasAnyRole, normalizeRolIds } from "../utils/roles";

export default function NotificationsRouter() {
  const { user } = useAuth();
  const rolIds = normalizeRolIds(user);

  if (hasAnyRole(rolIds, Roles.EMPLEADO)) {
    return <NotificationsEmployee />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">Notificaciones</Typography>
      <Typography>No hay notificaciones disponibles.</Typography>
    </Box>
  );
}
