import * as React from "react";
import {
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import type { Empresa } from "../../../types/auth";

interface EmpleadosFiltersProps {
  searchTerm: string;
  selectedEmpresaId: string;
  empresas: Empresa[];
  onSearchChange: (value: string) => void;
  onEmpresaChange: (value: string) => void;
  onCreateNew: () => void;
}

const EmpleadosFilters: React.FC<EmpleadosFiltersProps> = ({
  searchTerm,
  selectedEmpresaId,
  empresas,
  onSearchChange,
  onEmpresaChange,
  onCreateNew,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
          "@media (max-width: 900px)": {
            flexDirection: "column",
            alignItems: "stretch",
            gap: 1.5,
          },
        }}
      >
        <Box
          sx={{
            flex: "0 0 300px",
            "@media (max-width: 900px)": { flex: "0 0 auto", width: "100%" },
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel>Empresa</InputLabel>
            <Select
              value={selectedEmpresaId}
              onChange={(e) => onEmpresaChange(e.target.value)}
              label="Empresa"
            >
              <MenuItem value="" disabled>
                Selecciona una empresa
              </MenuItem>
              {empresas
                .filter((empresa) => empresa.esConsorcio !== false)
                .map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id.toString()}>
                    {empresa.nombre}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
        <Box 
          sx={{ 
            flex: "1 1 400px",
            "@media (max-width: 900px)": { flex: "0 0 auto", width: "100%" },
          }}
        >
          <TextField
            label="Buscar colaboradores"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: "action.active", mr: 1 }} />
              ),
            }}
          />
        </Box>
        <Box
          sx={{
            flex: "0 0 200px",
            "@media (max-width: 900px)": { flex: "0 0 auto", width: "100%" },
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
            fullWidth
          >
            Nuevo Colaborador
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default EmpleadosFilters;
