"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useDeferredIdle } from "../hooks/useDeferredIdle";
import { useFetchTemplates } from "../hooks/useFetchTemplates";
import {
  getRouteTemplateKinds,
  mergeEnabledTemplateKinds,
} from "../hooks/templateKinds";

type TemplateLoaderContextValue = {
  /** Load every template type used by header search / shortcut send. Safe to call repeatedly. */
  ensureHeaderTemplates: () => void;
  isHeaderCatalogLoading: boolean;
  isHeaderCatalogReady: boolean;
};

const TemplateLoaderContext = createContext<TemplateLoaderContextValue | null>(
  null,
);

export function TemplateLoaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefetchHeaderOnIdle = useDeferredIdle();
  const [headerRequested, setHeaderRequested] = useState(false);

  const ensureHeaderTemplates = useCallback(() => {
    setHeaderRequested(true);
  }, []);

  const enabledKinds = useMemo(() => {
    const routeKinds = getRouteTemplateKinds(pathname);
    const headerCatalog = headerRequested || prefetchHeaderOnIdle;
    return mergeEnabledTemplateKinds({ routeKinds, headerCatalog });
  }, [pathname, headerRequested, prefetchHeaderOnIdle]);

  const { isHeaderCatalogLoading, isHeaderCatalogReady } =
    useFetchTemplates(enabledKinds);

  const value = useMemo(
    () => ({
      ensureHeaderTemplates,
      isHeaderCatalogLoading,
      isHeaderCatalogReady,
    }),
    [ensureHeaderTemplates, isHeaderCatalogLoading, isHeaderCatalogReady],
  );

  return (
    <TemplateLoaderContext.Provider value={value}>
      {children}
    </TemplateLoaderContext.Provider>
  );
}

export function useTemplateLoader(): TemplateLoaderContextValue {
  const context = useContext(TemplateLoaderContext);
  if (!context) {
    throw new Error(
      "useTemplateLoader must be used within TemplateLoaderProvider",
    );
  }
  return context;
}
