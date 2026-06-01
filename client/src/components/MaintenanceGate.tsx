import { useFlags } from "../lib/feature-flags";
import MaintenancePage from "./MaintenancePage";

/**
 * MaintenanceGate
 * If the maintenance flag is true, renders the maintenance page
 * and blocks all other UI. This is the "kill switch" pattern.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { maintenance } = useFlags();

  if (maintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
