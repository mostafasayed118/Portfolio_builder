import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ViewingUserContextValue {
  viewingUserId: string | null;
  setViewingUserId: (userId: string | null) => void;
}

const ViewingUserContext = createContext<ViewingUserContextValue>({
  viewingUserId: null,
  setViewingUserId: () => {},
});

export function ViewingUserProvider({ children }: { children: ReactNode }) {
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const value = useMemo(() => ({ viewingUserId, setViewingUserId }), [viewingUserId]);

  return (
    <ViewingUserContext.Provider value={value}>
      {children}
    </ViewingUserContext.Provider>
  );
}

export function useViewingUser() {
  return useContext(ViewingUserContext);
}
