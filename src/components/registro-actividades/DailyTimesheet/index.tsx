import * as React from "react";
import { useDailyTimesheet } from "./hooks/useDailyTimesheet";
import { DailyTimesheetUI } from "./components/DailyTimesheetUI";

const DailyTimesheet: React.FC = () => {
  const hookData = useDailyTimesheet();
  return <DailyTimesheetUI {...hookData} />;
};

export default DailyTimesheet;
