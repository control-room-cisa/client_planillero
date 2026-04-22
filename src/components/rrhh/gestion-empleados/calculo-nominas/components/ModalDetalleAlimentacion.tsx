import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { DeduccionAlimentacionDetalleDto } from "../../../../../dtos/calculoHorasTrabajoDto";

interface ModalDetalleAlimentacionProps {
  open: boolean;
  onClose: () => void;
  detalle: DeduccionAlimentacionDetalleDto[];
  totalDetalle: number;
  formatCurrency: (valor: number) => string;
}

/** Modal con la tabla de consumos de alimentación del período. */
const ModalDetalleAlimentacion: React.FC<ModalDetalleAlimentacionProps> = ({
  open,
  onClose,
  detalle,
  totalDetalle,
  formatCurrency,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Detalle de deducción de alimentación</DialogTitle>
      <DialogContent dividers>
        {detalle.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Costo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detalle.map((item, index) => (
                <TableRow key={`${item.fecha}-${index}`}>
                  <TableCell>{item.producto || "N/D"}</TableCell>
                  <TableCell>
                    {new Date(item.fecha).toLocaleDateString("es-HN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(item.precio || 0)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Total
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" fontWeight={600}>
                    {formatCurrency(totalDetalle)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No se registran consumos de alimentación para este período.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalDetalleAlimentacion;
