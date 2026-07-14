import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "rec_account_id";

interface AccountContextValue {
  accountId: number | null;
  setAccountId: (id: number) => void;
  clearAccountId: () => void;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

function readStoredAccountId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountIdState] = useState<number | null>(readStoredAccountId);

  const setAccountId = useCallback((id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setAccountIdState(id);
  }, []);

  const clearAccountId = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAccountIdState(null);
  }, []);

  return (
    <AccountContext.Provider value={{ accountId, setAccountId, clearAccountId }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within an AccountProvider");
  return ctx;
}
