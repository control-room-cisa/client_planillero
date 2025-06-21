import React, { createContext, useContext, useState } from "react";

const DateRangeContext = createContext();

export const DateRangeProvider = ({ children }) => {
  const [rangoFechas, setRangoFechas] = useState(null);

  return (
    <DateRangeContext.Provider value={{ rangoFechas, setRangoFechas }}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => useContext(DateRangeContext);