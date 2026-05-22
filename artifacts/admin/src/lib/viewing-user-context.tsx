import { createContext, useContext, useState, type ReactNode } from "react";

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

  return (
    <ViewingUserContext.Provider value={{ viewingUserId, setViewingUserId }}>
      {children}
    </ViewingUserContext.Provider>
  );
}

export function useViewingUser() {
  return useContext(ViewingUserContext);
}
