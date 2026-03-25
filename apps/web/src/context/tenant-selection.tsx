import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTenantContext, setTenantContext } from "../lib/workspace-api";

type TenantSelection = {
  id: string | null;
  name: string;
};

type TenantSelectionContextValue = {
  selectedTenantId: string | null;
  selectedTenantName: string;
  activateTenant: (selection: { id: string; name: string }) => Promise<void>;
  activateGodMode: () => Promise<void>;
  isHydrating: boolean;
};

const TenantSelectionContext = createContext<TenantSelectionContextValue>({
  selectedTenantId: null,
  selectedTenantName: "",
  activateTenant: async () => {},
  activateGodMode: async () => {},
  isHydrating: true,
});

export function TenantSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<TenantSelection>({ id: null, name: "" });
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const shouldDefaultToGod =
      window.location.pathname === "/" ||
      window.location.pathname.startsWith("/workspace") ||
      window.location.pathname.startsWith("/mission-control");

    getTenantContext()
      .then(async (context) => {
        if (!isMounted) return;
        if (shouldDefaultToGod && context.mode === "tenant") {
          await setTenantContext(null);
          if (!isMounted) return;
          setSelection({ id: null, name: "" });
          return;
        }

        setSelection({
          id: context.tenant?.id ?? null,
          name: context.tenant?.name ?? "",
        });
      })
      .finally(() => {
        if (isMounted) setIsHydrating(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      selectedTenantId: selection.id,
      selectedTenantName: selection.name,
      activateTenant: async (nextSelection: { id: string; name: string }) => {
        await setTenantContext(nextSelection.id);
        setSelection(nextSelection);
      },
      activateGodMode: async () => {
        await setTenantContext(null);
        setSelection({ id: null, name: "" });
      },
      isHydrating,
    }),
    [isHydrating, selection]
  );

  return (
    <TenantSelectionContext.Provider value={value}>
      {children}
    </TenantSelectionContext.Provider>
  );
}

export function useTenantSelection() {
  return useContext(TenantSelectionContext);
}
