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
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
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
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Panel de Contabilidad
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
            <Tab
              icon={<BarChartIcon />}
              label="Reportes"
              {...a11yProps(2)}
              disabled
            />
            <Tab
              icon={<SettingsIcon />}
              label="Configuración"
              {...a11yProps(3)}
              disabled
            />
          </Tabs>

          <Box sx={{ p: 0 }}>
            <TabPanel value={tabValue} index={0}>
              <JobsManagement />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <EmpresasManagement />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">
                  Reportes (Funcionalidad en desarrollo)
                </Typography>
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">
                  Configuración (Funcionalidad en desarrollo)
                </Typography>
              </Box>
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ContabilidadDashboard;
