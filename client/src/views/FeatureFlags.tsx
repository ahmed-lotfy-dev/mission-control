import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useFlags } from "../lib/feature-flags";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { UpdatingStatus } from "../components/UpdatingStatus";

interface FlagInfo {
  key: string;
  value: boolean;
}

export default function FeatureFlags() {
  const { flags, maintenance } = useFlags();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("false");

  const flagEntries = Object.entries(flags)
    .filter(([key]) => key.toLowerCase().includes(search.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  const activeCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  const handleCreate = () => {
    if (!newKey.trim()) {
      toast.error("Flag key is required");
      return;
    }
    // Note: In a real implementation, this would POST to /api/flags
    // For now (env-based), we tell the user to update .env
    toast.info(
      `To add "${newKey}", update FEATURE_FLAGS in your .env file and restart the server.`,
      { duration: 6000 }
    );
    setShowCreate(false);
    setNewKey("");
    setNewValue("false");
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Feature Flags</h1>
          <div className="subtitle">Control feature availability across environments</div>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Flag</Button>
      </div>

      {/* Status Banner */}
      {maintenance && (
        <div className="ff-maintenance-banner">
          <div className="ff-maintenance-banner-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="var(--accent)" strokeWidth="1.5" />
              <path d="M10 6V11" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="14" r="1" fill="var(--accent)" />
            </svg>
          </div>
          <div className="ff-maintenance-banner-text">
            <strong>Maintenance Mode Active</strong>
            <span>All users are seeing the maintenance page</span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid-4 mb-24">
        <div className="ff-stat-card">
          <div className="ff-stat-icon ff-stat-icon-total">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="ff-stat-value">{totalCount}</div>
          <div className="ff-stat-label">Total Flags</div>
        </div>
        <div className="ff-stat-card">
          <div className="ff-stat-icon ff-stat-icon-active">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="ff-stat-value ff-stat-value-active">{activeCount}</div>
          <div className="ff-stat-label">Active</div>
        </div>
        <div className="ff-stat-card">
          <div className="ff-stat-icon ff-stat-icon-inactive">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 8L12 12M12 8L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="ff-stat-value ff-stat-value-inactive">{totalCount - activeCount}</div>
          <div className="ff-stat-label">Inactive</div>
        </div>
        <div className="ff-stat-card">
          <div className="ff-stat-icon ff-stat-icon-source">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4H16V14H4L2 16V4H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M6 7H14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
              <path d="M6 10H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <div className="ff-stat-value ff-stat-value-source">.env</div>
          <div className="ff-stat-label">Source</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="ff-info-banner">
        <div className="ff-info-banner-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--accent)" strokeWidth="1.2" />
            <path d="M8 7V11" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="5" r="0.8" fill="var(--accent)" />
          </svg>
        </div>
        <div className="ff-info-banner-text">
          Flags are configured via the <code>FEATURE_FLAGS</code> environment variable as a JSON object.
          Changes require a server restart to take effect.
        </div>
      </div>

      {/* Search */}
      <div className="ff-search-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flags..."
          className="ff-search-input"
        />
      </div>

      {/* Flags Table */}
      <div className="card ff-table-card">
        {flagEntries.length > 0 ? (
          <div className="ff-table">
            <div className="ff-table-header">
              <div className="ff-table-col ff-table-col-flag">Flag</div>
              <div className="ff-table-col ff-table-col-status">Status</div>
              <div className="ff-table-col ff-table-col-type">Type</div>
              <div className="ff-table-col ff-table-col-actions">Actions</div>
            </div>
            {flagEntries.map(([key, value]) => (
              <div key={key} className="ff-table-row">
                <div className="ff-table-col ff-table-col-flag">
                  <div className="ff-flag-key">{key}</div>
                </div>
                <div className="ff-table-col ff-table-col-status">
                  <div className={`ff-status-badge ${value ? "ff-status-active" : "ff-status-inactive"}`}>
                    <span className="ff-status-dot" />
                    {value ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="ff-table-col ff-table-col-type">
                  <span className="ff-type-badge">
                    {key === "maintenance" ? "Kill Switch" : "Feature"}
                  </span>
                </div>
                <div className="ff-table-col ff-table-col-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toast.info(
                        `To toggle "${key}", update FEATURE_FLAGS in .env and restart.`,
                        { duration: 5000 }
                      );
                    }}
                  >
                    Edit in .env
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state p-10">
            <div className="icon">🏳️</div>
            <p>{search ? "No flags match your search" : "No feature flags configured"}</p>
            <p className="hint">Add FEATURE_FLAGS to your .env file to get started</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="form-group">
              <label>Flag Key</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. newDashboard"
              />
            </div>
            <div className="form-group">
              <label>Initial Value</label>
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="ff-select"
              >
                <option value="false">false (disabled)</option>
                <option value="true">true (enabled)</option>
              </select>
            </div>
            <div className="ff-dialog-note">
              This will show you the exact JSON to add to your .env file.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Generate Config</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
