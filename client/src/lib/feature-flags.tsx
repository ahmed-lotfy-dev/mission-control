import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface FeatureFlags {
  flags: Record<string, boolean>;
  maintenance: boolean;
}

const defaultFlags: FeatureFlags = { flags: {}, maintenance: false };

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch("/api/flags");
      if (!res.ok) return;
      const data = await res.json();
      setFlags({
        flags: data.flags ?? {},
        maintenance: data.maintenance === true,
      });
    } catch {
      // Silently fail — flags are non-critical
    }
  }, []);

  useEffect(() => {
    fetchFlags();
    // Poll every 30s so flag changes propagate without restart
    const interval = setInterval(fetchFlags, 30000);
    return () => clearInterval(interval);
  }, [fetchFlags]);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFlags() {
  return useContext(FeatureFlagsContext);
}
