import { useVaultData } from "./hooks/useVaultData";
import { Dashboard } from "./components/Dashboard";
import { VaultSwitcher } from "./components/VaultSwitcher";
import { EmptyState, ErrorState, LoadingState } from "./components/States";
import { CrossVaultSummary } from "./components/CrossVaultSummary";

function App() {
  const { vaultIndex, selectedVaultId, setSelectedVaultId, snapshot } = useVaultData();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-1">
              {vaultIndex.status === "success" && (
                <VaultSwitcher
                  vaultIndex={vaultIndex.data}
                  selectedId={selectedVaultId}
                  onSelect={setSelectedVaultId}
                />
              )}
            </div>
            {/* Could add a theme toggle here later */}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Index States */}
        {vaultIndex.status === "loading" && <LoadingState />}
        {vaultIndex.status === "error" && <ErrorState error={vaultIndex.error} />}
        {vaultIndex.status === "empty" && <EmptyState />}

        {/* Selected Vault Snapshot States */}
        {vaultIndex.status === "success" && selectedVaultId === "__summary__" && (
          <CrossVaultSummary vaultIndex={vaultIndex.data} />
        )}

        {vaultIndex.status === "success" &&
          selectedVaultId &&
          selectedVaultId !== "__summary__" && (
            <>
              {snapshot.status === "loading" && <LoadingState />}
              {snapshot.status === "error" && <ErrorState error={snapshot.error} />}
              {snapshot.status === "empty" && <EmptyState />}
              {snapshot.status === "success" && <Dashboard snapshot={snapshot.data} />}
            </>
          )}
      </main>
    </div>
  );
}

export default App;
