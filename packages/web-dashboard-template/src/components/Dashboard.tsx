import { useState } from "react";
import type { VaultSnapshot } from "@vault-insights/shared";
import { SummaryCards } from "./SummaryCards";
import { TopNotesTable } from "./TopNotesTable";
import { TagBreakdownChart } from "./TagBreakdownChart";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { Search } from "lucide-react";

interface Props {
  snapshot: VaultSnapshot;
}

export function Dashboard({ snapshot }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col gap-6">
      {/* Header Area with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 mb-2">
        <div>
          <p className="text-textSecondary text-sm">
            Last updated: {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textSecondary">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg leading-5 bg-background text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-all"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <SummaryCards totals={snapshot.totals} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Table takes 2/3 space on large screens) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TopNotesTable notes={snapshot.notes} searchQuery={searchQuery} />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <ActivityHeatmap notes={snapshot.notes} />
          <TagBreakdownChart notes={snapshot.notes} />
        </div>
      </div>
    </div>
  );
}
