import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";

export type PeriodoGrupo = {
  mesLabel: string;
  periodos: Array<{ value: string; label: string }>;
};

interface DescargarProrrateoExcelModalProps {
  open: boolean;
  downloading: boolean;
  selectedYear: number;
  selectedPeriodo: string | null;
  añosDisponibles: number[];
  periodosDisponibles: PeriodoGrupo[];
  onClose: () => void;
  onYearChange: (year: number) => void;
  onPeriodoChange: (periodo: string | null) => void;
  onConfirm: () => void;
}

const DescargarProrrateoExcelModal: React.FC<
  DescargarProrrateoExcelModalProps
> = ({
  open,
  downloading,
  selectedYear,
  selectedPeriodo,
  añosDisponibles,
  periodosDisponibles,
  onClose,
  onYearChange,
  onPeriodoChange,
  onConfirm,
}) => {
  const canConfirm = !!selectedPeriodo && !downloading;

  return (
    <Dialog open={open} onClose={downloading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Descargar Prorrateo Excel</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(e) => onYearChange(Number(e.target.value))}
              disabled={downloading}
            >
              {añosDisponibles.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Período</InputLabel>
            <Select
              value={selectedPeriodo ?? ""}
              label="Período"
              onChange={(e) =>
                onPeriodoChange(e.target.value ? String(e.target.value) : null)
              }
              disabled={downloading}
              displayEmpty
              renderValue={(value) => {
                if (!value) return "Seleccione";
                for (const grupo of periodosDisponibles) {
                  const periodo = grupo.periodos.find((p) => p.value === value);
                  if (periodo) {
                    return `${grupo.mesLabel} - ${periodo.label}`;
                  }
                }
                return String(value);
              }}
            >
              <MenuItem value="">
                <em>Seleccione</em>
              </MenuItem>
              {periodosDisponibles.map((grupo) => [
                <MenuItem
                  key={`hdr-${grupo.mesLabel}`}
                  disabled
                  sx={{ fontWeight: 700, opacity: 1 }}
                >
                  {grupo.mesLabel}
                </MenuItem>,
                ...grupo.periodos.map((p) => (
                  <MenuItem key={p.value} value={p.value} sx={{ pl: 3 }}>
                    {p.label}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={downloading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!canConfirm}
          startIcon={
            downloading ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Descargar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DescargarProrrateoExcelModal;
