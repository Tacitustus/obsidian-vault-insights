import { Info, AlertTriangle } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-6 bg-surface rounded-full mb-6 text-accent">
        <Info size={48} />
      </div>
      <h2 className="text-2xl font-bold text-textPrimary mb-3">No Data Available Yet</h2>
      <p className="text-textSecondary max-w-md mx-auto">
        If you just set up Vault Insights, please use the
        <strong className="text-textPrimary mx-1">"Export snapshot as JSON"</strong>
        command inside Obsidian to generate and sync your first dataset.
      </p>
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-6 bg-surface rounded-full mb-6 text-warning">
        <AlertTriangle size={48} />
      </div>
      <h2 className="text-2xl font-bold text-textPrimary mb-3">Unable to Load Dashboard</h2>
      <p className="text-textSecondary max-w-md mx-auto bg-surfaceHover p-4 rounded-lg font-mono text-sm border border-border">
        {error}
      </p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-surfaceHover border-t-accent rounded-full animate-spin"></div>
      <p className="mt-4 text-textSecondary font-medium">Loading Vault Insights...</p>
    </div>
  );
}
