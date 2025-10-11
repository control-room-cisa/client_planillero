import React, { useState } from "react";
import {
  Box,
  Typography,
  Tab,
  Tabs,
  Paper,
  Divider,
  Container,
} from "@mui/material";
import {
  Work as WorkIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import JobsManagement from "./JobsManagement";
import EmpresasManagement from "./EmpresasManagement";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contabilidad-tabpanel-${index}`}
      aria-labelledby={`contabilidad-tab-${index}`}
      {...other}
      style={{ width: "100%" }}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `contabilidad-tab-${index}`,
    "aria-controls": `contabilidad-tabpanel-${index}`,
  };
}

const ContabilidadDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ py: 4 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: "bold", minWidth: 0 }}
        >
          Jobs y Empresas
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Paper sx={{ width: "100%" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="Contabilidad tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<WorkIcon />}
              label="Gestión de Jobs"
              {...a11yProps(0)}
            />
            <Tab icon={<BusinessIcon />} label="Empresas" {...a11yProps(1)} />
            {/* Prorrateo tiene su propia ruta en /contabilidad/prorrateo */}
          </Tabs>

          <Box sx={{ p: 0 }}>
            <TabPanel value={tabValue} index={0}>
              <JobsManagement />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <EmpresasManagement />
            </TabPanel>
            {/* Tabs no usados removidos */}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ContabilidadDashboard;
