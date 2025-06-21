import React, { useState } from "react";
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Chip,
  Grid,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useDateRange } from "../../context/DateRangeContext";


const Header = ({ onMenuClick }) => {
  const { user } = useUser();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMobile = useMediaQuery("(max-width:900px)");
  const navigate = useNavigate();
  const { setRangoFechas } = useDateRange();


  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  if (!user) return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setRangoFechas(null);
    navigate("/login");
  };

  return (
    <Box
      sx={{
        backgroundColor: "#F7FBFF",
        borderBottom: "1px solid #e0e0e0",
        px: 2,
        py: 2,
      }}
    >
      {isMobile ? (
        <Grid container direction="column" spacing={1.5}>
          <Grid container direction="row" alignItems="center" spacing={2}>
            <Grid>
              <IconButton onClick={onMenuClick}>
                <MenuIcon />
              </IconButton>
            </Grid>

            <Grid>
              <Chip
                label="Cerrar Sesión"
                variant="outlined"
                color="success"
                icon={<LogoutIcon sx={{ fontSize: 20 }} />}
                onClick={handleLogout}
                clickable
                sx={{
                  fontSize: {
                    xs: "0.75rem",
                    sm: "0.85rem",
                    md: "1rem",
                  },
                  fontWeight: "bold",
                  px: 2,
                  width: {
                    xs: 170,
                    sm: 170,
                    md: 250,
                  },
                  borderColor: "#15C174",
                  borderWidth: 2,
                  cursor: "pointer",
                }}
              />
            </Grid>

            <Grid>
              <Typography
                variant="subtitle1"
                sx={{
                  color: "#424242",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {`${user.nombre} ${user.apellido}`
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Typography>
            </Grid>
          </Grid>

          <Grid container direction="row" alignItems="center" spacing={2}>
            <Grid >
              <IconButton
                onMouseEnter={handleOpen}
                sx={{ color: "#424242", padding: "6px" }}
              >
                <ManageAccountsIcon sx={{ fontSize: "1.5rem" }} />
              </IconButton>
            </Grid>

            <Grid >
              <IconButton sx={{ color: "#424242", padding: "6px" }}>
                <NotificationsIcon sx={{ fontSize: "1.5rem" }}/>
              </IconButton>
            </Grid>
          </Grid>
        </Grid>
      ) : (
        <Grid
          container
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={2}
        >
          <Grid>
              <Chip
                label="Cerrar Sesión"
                variant="outlined"
                color="success"
                icon={<LogoutIcon sx={{ fontSize: 20 }} />}
                onClick={handleLogout}
                clickable
                sx={{
                  fontSize: {
                    xs: "0.75rem",
                    sm: "0.85rem",
                    md: "1rem",
                  },
                  fontWeight: "bold",
                  px: 2,
                  width: {
                    xs: 170,
                    sm: 170,
                    md: 181,
                  },
                  borderColor: "#15C174",
                  borderWidth: 2,
                  cursor: "pointer",
                }}
              />
            </Grid>

          <Grid>
            <Typography
              variant="subtitle1"
              sx={{
                color: "#424242",
                fontSize: { sm: 16, md: 18 },
                fontWeight: 500,
              }}
            >
              {`${user.nombre} ${user.apellido}`
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </Typography>
          </Grid>

          <Grid>
            <IconButton
              onMouseEnter={handleOpen}
              sx={{ color: "#424242", padding: "6px" }}
            >
              <ManageAccountsIcon sx={{ fontSize: "1.8rem" }}/>
            </IconButton>
          </Grid>

          <Grid>
            <IconButton sx={{ color: "#424242", padding: "6px" }}>
              <NotificationsIcon sx={{ fontSize: "1.8rem" }}/>
            </IconButton>
          </Grid>
        </Grid>
      )}

      {/* Menú desplegable (configuración) */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onMouseLeave={handleClose}
        PaperProps={{ sx: { mt: 1.5, width: 200 } }}
      >
        <MenuItem onClick={handleClose}>Ver perfil</MenuItem>
        <MenuItem onClick={handleClose}>Editar perfil</MenuItem>
      </Menu>
    </Box>
  );
};

export default Header;
