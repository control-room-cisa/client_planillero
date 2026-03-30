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

type MontoKey =
  | "normal"
  | "p25"
  | "p50"
  | "p75"
  | "p100"
  | "compTom"
  | "compDev";

interface IncidenciaItem {
  label: string;
  data: { horas: number; porcentaje: string };
  color: string;
  description: string;
  montoKey: MontoKey;
}

interface DesgloseIncidenciasProps {
  desglose: DesgloseIncidencias | null;
  loading: boolean;
  extrasMontos?: {
    normal: number;
    p25: number;
    p50: number;
    p75: number;
    p100: number;
    /** Valor a tarifa hora normal (×1); suma a total de percepciones */
    compensatoriasTomadas?: number;
  };
  currencyFormatter?: (n: number) => string;
  horasNormales?: number;
}

const DesgloseIncidenciasComponent: React.FC<DesgloseIncidenciasProps> = ({
  desglose,
  loading,
  extrasMontos,
  currencyFormatter,
  horasNormales,
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

  const baseIncidencias: IncidenciaItem[] = [
    {
      label: "Normal",
      data: desglose.normal,
      color: "#4caf50",
      description: "Horas normales de trabajo",
      montoKey: "normal",
    },
    {
      label: "25%",
      data: desglose.overtime25,
      color: "#ff9800",
      description: "Horas extra con 25% de recargo",
      montoKey: "p25",
    },
    {
      label: "50%",
      data: desglose.overtime50,
      color: "#f57c00",
      description: "Horas extra con 50% de recargo",
      montoKey: "p50",
    },
    {
      label: "75%",
      data: desglose.overtime75,
      color: "#e65100",
      description: "Horas extra con 75% de recargo",
      montoKey: "p75",
    },
    {
      label: "100%",
      data: desglose.overtime100,
      color: "#d84315",
      description: "Horas extra con 100% de recargo",
      montoKey: "p100",
    },
  ];

  const incidencias: IncidenciaItem[] = [...baseIncidencias];

  if (desglose.compensatoriasTomadas.horas > 0) {
    incidencias.push({
      label: "Comp. tomadas",
      data: desglose.compensatoriasTomadas,
      color: "#5c6bc0",
      description: "",
      montoKey: "compTom",
    });
  }
  if (desglose.compensatoriasDevueltas.horas > 0) {
    incidencias.push({
      label: "Comp. devueltas",
      data: desglose.compensatoriasDevueltas,
      color: "#00897b",
      description: "",
      montoKey: "compDev",
    });
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(3, 1fr)",
          md: "repeat(4, 1fr)",
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
              {item.label === "Normal" && horasNormales !== undefined
                ? horasNormales
                : item.data.horas}
            </Typography>
            {item.montoKey === "compDev" ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                horas ({item.data.porcentaje})
              </Typography>
            ) : extrasMontos && currencyFormatter ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {"Monto: "}
                {item.montoKey === "compTom"
                  ? currencyFormatter(extrasMontos.compensatoriasTomadas ?? 0)
                  : currencyFormatter(
                      extrasMontos[item.montoKey as keyof typeof extrasMontos] as number,
                    )}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                horas ({item.data.porcentaje})
              </Typography>
            )}
            {item.description ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                {item.description}
              </Typography>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default DesgloseIncidenciasComponent;
