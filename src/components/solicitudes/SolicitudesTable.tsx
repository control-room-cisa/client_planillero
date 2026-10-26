import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import type { SolicitudPermiso } from "../../services/solicitudPermisoService";
import {
  EstadoAprobacion,
  TIPO_LABEL,
  formatFechaHora,
  nombreEmpleado,
  rangoFechas,
} from "./solicitudesUi";

type SolicitudesTableProps = {
  items: SolicitudPermiso[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  showEmpleado: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onOpen: (id: number) => void;
  onEdit?: (row: SolicitudPermiso) => void;
  onDelete?: (row: SolicitudPermiso) => void;
};

const headCellSx = { fontWeight: 600, whiteSpace: "nowrap" as const };

export default function SolicitudesTable({
  items,
  total,
  page,
  limit,
  loading,
  showEmpleado,
  onPageChange,
  onLimitChange,
  onOpen,
  onEdit,
  onDelete,
}: SolicitudesTableProps) {
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {showEmpleado && <TableCell sx={headCellSx}>Colaborador</TableCell>}
              <TableCell sx={headCellSx}>Tipo</TableCell>
              <TableCell sx={headCellSx}>Días</TableCell>
              <TableCell sx={headCellSx}>Supervisor</TableCell>
              <TableCell sx={headCellSx}>RRHH</TableCell>
              <TableCell sx={headCellSx}>Creada</TableCell>
              <TableCell sx={headCellSx} align="right">
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={showEmpleado ? 7 : 6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No hay solicitudes en esta página.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((row) => (
              <TableRow key={row.id} hover>
                {showEmpleado && (
                  <TableCell>{nombreEmpleado(row.empleado)}</TableCell>
                )}
                <TableCell>{TIPO_LABEL[row.tipo]}</TableCell>
                <TableCell>{rangoFechas(row)}</TableCell>
                <TableCell>
                  <EstadoAprobacion value={row.aprobacionSupervisor} />
                </TableCell>
                <TableCell>
                  <EstadoAprobacion value={row.aprobacionRrhh} />
                </TableCell>
                <TableCell>{formatFechaHora(row.createdAt)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <Tooltip title="Ver">
                    <IconButton size="small" onClick={() => onOpen(row.id)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {onEdit && row.editable && (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => onEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {onDelete && row.editable && (
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={Math.max(0, page - 1)}
        onPageChange={(_, next) => onPageChange(next + 1)}
        rowsPerPage={limit}
        onRowsPerPageChange={(event) =>
          onLimitChange(parseInt(event.target.value, 10))
        }
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Filas"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
      />
    </Paper>
  );
}
