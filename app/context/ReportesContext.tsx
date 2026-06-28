import React, { createContext, useContext, useState } from "react";

type ReportesData = {
  compras: any[];
  ventas: any[];
};

type ReportesContextType = {
  data: ReportesData | null;
  setData: (d: ReportesData) => void;
};

const ReportesContext = createContext<ReportesContextType>({
  data: null,
  setData: () => {},
});

export const ReportesProvider = ({ children }: any) => {
  const [data, setData] = useState<ReportesData | null>(null);

  return (
    <ReportesContext.Provider value={{ data, setData }}>
      {children}
    </ReportesContext.Provider>
  );
};

export const useReportes = () => useContext(ReportesContext);
