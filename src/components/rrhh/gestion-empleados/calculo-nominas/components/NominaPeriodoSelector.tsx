import * as React from "react";
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
} from "@mui/material";
import {
  claveMesFinIso,
  nombreMesFinIso,
  type IntervaloNominaCalculo,
} from "../utils/periodos";

interface NominaPeriodoSelectorProps {
  añoNominas: number;
  añosDisponibles: number[];
  onAñoChange: (event: any) => void;
  intervalosDelAño: IntervaloNominaCalculo[];
  intervaloSeleccionado: string;
  onIntervaloChange: (event: any) => void;
  /**
   * Layout: `inline` para escritorio (año + período a la derecha del avatar)
   * o `stacked` para móvil (cada select en una fila full-width).
   */
  variant: "inline" | "stacked";
}

/** Renderiza los MenuItem del Select agrupados por mes (A y B juntos sin divisor). */
const renderIntervalosSelectItems = (intervalos: IntervaloNominaCalculo[]) => {
  return intervalos.map((intervalo, index) => {
    const anterior = index > 0 ? intervalos[index - 1] : null;
    const nuevoGrupoMes =
      index === 0 ||
      (anterior != null &&
        claveMesFinIso(intervalo.fechaFin) !==
          claveMesFinIso(anterior.fechaFin));

    const items: React.ReactNode[] = [];

    if (nuevoGrupoMes) {
      items.push(
        <Divider
          key={`div-${intervalo.valor}`}
          sx={{
            my: 0.5,
            borderColor: "divider",
          }}
        />,
      );
      items.push(
        <ListSubheader
          key={`sub-${intervalo.valor}`}
          disableSticky
          sx={{
            fontWeight: 600,
            fontSize: "0.8125rem",
            lineHeight: 2,
            py: 0.25,
            color: "text.secondary",
            bgcolor: "transparent",
            backgroundImage: "none",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {nombreMesFinIso(intervalo.fechaFin)}
        </ListSubheader>,
      );
    }

    items.push(
      <MenuItem key={intervalo.valor} value={intervalo.valor}>
        {intervalo.label}
      </MenuItem>,
    );

    return items;
  });
};

const labelSx = {
  color: "rgba(255,255,255,0.7)",
  fontSize: "0.875rem",
};

const selectSx = {
  color: "white",
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255,255,255,0.3)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255,255,255,0.5)",
  },
  "& .MuiSelect-icon": { color: "white" },
};

const NominaPeriodoSelector: React.FC<NominaPeriodoSelectorProps> = ({
  añoNominas,
  añosDisponibles,
  onAñoChange,
  intervalosDelAño,
  intervaloSeleccionado,
  onIntervaloChange,
  variant,
}) => {
  if (variant === "stacked") {
    return (
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          flexDirection: "column",
          gap: 1.5,
          alignItems: "stretch",
        }}
      >
        <FormControl size="small" sx={{ width: "100%" }}>
          <InputLabel sx={labelSx}>Año</InputLabel>
          <Select
            value={añoNominas}
            onChange={onAñoChange}
            label="Año"
            size="small"
            sx={selectSx}
          >
            {añosDisponibles.map((año) => (
              <MenuItem key={año} value={año}>
                {año}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ width: "100%" }}>
          <InputLabel sx={labelSx}>Período</InputLabel>
          <Select
            value={intervaloSeleccionado}
            onChange={onIntervaloChange}
            label="Período"
            size="small"
            disabled={intervalosDelAño.length === 0}
            sx={selectSx}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 300 },
              },
            }}
          >
            <MenuItem value="">
              <em>Selecciona un período</em>
            </MenuItem>
            {renderIntervalosSelectItems(intervalosDelAño)}
          </Select>
        </FormControl>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        flexShrink: 0,
        gap: 1.5,
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      <FormControl
        size="small"
        sx={{ minWidth: 96, width: { sm: "auto" } }}
      >
        <InputLabel sx={labelSx}>Año</InputLabel>
        <Select
          value={añoNominas}
          onChange={onAñoChange}
          label="Año"
          size="small"
          sx={selectSx}
        >
          {añosDisponibles.map((año) => (
            <MenuItem key={año} value={año}>
              {año}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl
        size="small"
        sx={{
          minWidth: { sm: 220, md: 280 },
          width: { sm: "auto" },
        }}
      >
        <InputLabel sx={labelSx}>Período</InputLabel>
        <Select
          value={intervaloSeleccionado}
          onChange={onIntervaloChange}
          label="Período"
          size="small"
          disabled={intervalosDelAño.length === 0}
          sx={selectSx}
          MenuProps={{
            PaperProps: {
              sx: { maxHeight: 300 },
            },
          }}
        >
          <MenuItem value="">
            <em>Selecciona un período</em>
          </MenuItem>
          {renderIntervalosSelectItems(intervalosDelAño)}
        </Select>
      </FormControl>
    </Box>
  );
};

export default NominaPeriodoSelector;
