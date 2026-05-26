import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Theme } from "./theme-types";

interface ThemeSyncState {
  /** Whether a DB theme mode was applied on this visit (or was persisted from a previous visit) */
  isSynced: boolean;
  /** The mode that was applied */
  mode: Theme | null;
  /** The system-preference theme before the DB mode was applied */
  previousTheme: Theme | null;
  /** Mark the sync as acknowledged/consumed (hides the banner) */
  acknowledge: () => void;
  /** Called by SupabaseThemeSync to record a new DB theme sync */
  recordSync: (appliedMode: Theme, prevTheme: Theme) => void;
}

const ThemeSyncContext = createContext<ThemeSyncState>({
  isSynced: false,
  mode: null,
  previousTheme: null,
  acknowledge: () => {},
  recordSync: () => {},
});

export function ThemeSyncProvider({ children }: { children: ReactNode }) {
  const [isSynced, setIsSynced] = useState(false);
  const [mode, setMode] = useState<Theme | null>(null);
  const [previousTheme, setPreviousTheme] = useState<Theme | null>(null);

  const acknowledge = useCallback(() => {
    setIsSynced(false);
  }, []);

  const recordSync = useCallback((appliedMode: Theme, prevTheme: Theme) => {
    setIsSynced(true);
    setMode(appliedMode);
    setPreviousTheme(prevTheme);
  }, []);

  return (
    <ThemeSyncContext.Provider value={{ isSynced, mode, previousTheme, acknowledge, recordSync }}>
      {children}
    </ThemeSyncContext.Provider>
  );
}

export const useThemeSync = () => useContext(ThemeSyncContext);
