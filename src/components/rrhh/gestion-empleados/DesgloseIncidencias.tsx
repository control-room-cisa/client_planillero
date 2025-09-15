// src/components/rrhh/gestion-empleados/DesgloseIncidencias.tsx
import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import type { DesgloseIncidencias } from "../../../services/calculoHorasTrabajoService";

interface DesgloseIncidenciasProps {
  desglose: DesgloseIncidencias | null;
  loading: boolean;
  extrasMontos?: { p25: number; p50: number; p75: number; p100: number };
  currencyFormatter?: (n: number) => string;
}

const DesgloseIncidenciasComponent: React.FC<DesgloseIncidenciasProps> = ({
  desglose,
  loading,
  extrasMontos,
  currencyFormatter,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!desglose) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Selecciona una fecha de corte para ver el desglose de incidencias.
        </Typography>
      </Paper>
    );
  }

  const incidencias = [
    {
      label: "Normal",
      data: desglose.normal,
      color: "#4caf50",
      description: "Horas normales de trabajo",
    },
    {
      label: "25%",
      data: desglose.overtime25,
      color: "#ff9800",
      description: "Horas extra con 25% de recargo",
    },
    {
      label: "50%",
      data: desglose.overtime50,
      color: "#f57c00",
      description: "Horas extra con 50% de recargo",
    },
    {
      label: "75%",
      data: desglose.overtime75,
      color: "#e65100",
      description: "Horas extra con 75% de recargo",
    },
    {
      label: "100%",
      data: desglose.overtime100,
      color: "#d84315",
      description: "Horas extra con 100% de recargo",
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(3, 1fr)",
          md: "repeat(5, 1fr)",
        },
        gap: 2,
        mt: 2,
      }}
    >
      {incidencias.map((item) => (
        <Card
          key={item.label}
          sx={{
            textAlign: "center",
            transition: "transform 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: 3,
            },
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ color: item.color, mb: 1 }}>
              {item.label}
            </Typography>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {item.data.horas}
            </Typography>
            {item.label !== "Normal" && extrasMontos && currencyFormatter ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Monto:{" "}
                {currencyFormatter(
                  item.label === "25%"
                    ? extrasMontos.p25
                    : item.label === "50%"
                    ? extrasMontos.p50
                    : item.label === "75%"
                    ? extrasMontos.p75
                    : extrasMontos.p100
                )}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                horas ({item.data.porcentaje})
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {item.description}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default DesgloseIncidenciasComponent;
