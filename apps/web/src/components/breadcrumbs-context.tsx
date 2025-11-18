"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type BreadcrumbContextType = {
  dynamicTitles: Map<string, string>;
  setTitle: (path: string, title: string) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
  undefined
);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [dynamicTitles, setDynamicTitles] = useState<Map<string, string>>(
    new Map()
  );

  const setTitle = (path: string, title: string) => {
    setDynamicTitles((prev) => {
      const next = new Map(prev);
      next.set(path, title);
      return next;
    });
  };

  return (
    <BreadcrumbContext.Provider value={{ dynamicTitles, setTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error(
      "useBreadcrumbContext must be used within BreadcrumbProvider"
    );
  }
  return context;
}
