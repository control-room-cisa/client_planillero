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
  /** `hidden`: el hijo controla el scroll (p. ej. tabla). `auto`: scroll del panel completo. */
  panelOverflow?: "hidden" | "auto";
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, panelOverflow = "auto", ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contabilidad-tabpanel-${index}`}
      aria-labelledby={`contabilidad-tab-${index}`}
      {...other}
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        display: value === index ? "flex" : "none",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {value === index && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: panelOverflow,
          }}
        >
          {children}
        </Box>
      )}
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
    <Container
      maxWidth="xl"
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        py: 2,
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: "bold", minWidth: 0 }}
        >
          Jobs y Empresas
        </Typography>
        <Divider sx={{ mb: 2, mt: 1 }} />
      </Box>

      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Contabilidad tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flexShrink: 0, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<WorkIcon />}
            label="Gestión de Jobs"
            {...a11yProps(0)}
          />
          <Tab icon={<BusinessIcon />} label="Empresas" {...a11yProps(1)} />
        </Tabs>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            px: 0,
            pb: 0,
          }}
        >
          <TabPanel value={tabValue} index={0} panelOverflow="auto">
            <JobsManagement />
          </TabPanel>
          <TabPanel value={tabValue} index={1} panelOverflow="hidden">
            <EmpresasManagement />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};

export default ContabilidadDashboard;
