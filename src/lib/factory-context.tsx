"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

type Factory = {
  id: string;
  name: string;
  slug: string;
  type: string;
  code: string;
  config: Record<string, unknown> | null;
  role: string;
  organizationName: string;
};

type FactoryContextType = {
  factories: Factory[];
  current: Factory | null;
  setCurrent: (factory: Factory) => void;
  addFactory: (factory: Factory) => void;
};

const FactoryContext = createContext<FactoryContextType>({
  factories: [],
  current: null,
  setCurrent: () => {},
  addFactory: () => {},
});

const STORAGE_KEY = "enxuga_factory_id";

export function FactoryProvider({
  factories: initialFactories,
  children,
}: {
  factories: Factory[];
  children: React.ReactNode;
}) {
  const [factories, setFactories] = useState(initialFactories);
  const [current, setCurrentState] = useState<Factory | null>(() => {
    if (factories.length === 0) return null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const found = factories.find((f) => f.id === stored);
        if (found) return found;
      } catch {}
    }
    return factories[0];
  });

  const setCurrent = useCallback(
    (factory: Factory) => {
      setCurrentState(factory);
      try {
        localStorage.setItem(STORAGE_KEY, factory.id);
      } catch {}
    },
    []
  );

  const addFactory = useCallback((factory: Factory) => {
    setFactories((prev) => [...prev, factory]);
    setCurrent(factory);
  }, [setCurrent]);

  useEffect(() => {
    if (current && factories.length > 0 && !factories.find((f) => f.id === current.id)) {
      setCurrent(factories[0]);
    }
  }, [factories, current, setCurrent]);

  return (
    <FactoryContext.Provider value={{ factories, current, setCurrent, addFactory }}>
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory() {
  return useContext(FactoryContext);
}
