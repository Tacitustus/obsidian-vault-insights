import { useMemo } from "react";
import type { NoteAggregate } from "@vault-insights/shared";

interface Props {
  notes: NoteAggregate[];
}

export function ActivityHeatmap({ notes }: Props) {
  // Map lastOpened to a daily count
  const dailyCounts = useMemo(() => {
    const counts = new Map<string, number>();

    notes.forEach((note) => {
      if (note.lastOpened > 0) {
        // Date format: YYYY-MM-DD
        const dateStr = new Date(note.lastOpened).toISOString().split("T")[0];
        counts.set(dateStr!, (counts.get(dateStr!) || 0) + 1);
      }
    });

    return counts;
  }, [notes]);

  // Generate last 90 days grid
  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]!;

      const count = dailyCounts.get(dateStr) || 0;
      arr.push({ date: dateStr, count });
    }
    return arr;
  }, [dailyCounts]);

  const maxCount = Math.max(1, ...Array.from(dailyCounts.values()));

  const getColor = (count: number) => {
    if (count === 0) return "bg-surfaceHover";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-accent/40";
    if (ratio < 0.5) return "bg-accent/60";
    if (ratio < 0.75) return "bg-accent/80";
    return "bg-accent";
  };

  return (
    <div className="glass-panel p-5 flex flex-col">
      <h2 className="text-lg font-bold text-textPrimary mb-4">Activity (Last Accessed)</h2>

      <div className="flex flex-col items-center">
        {/* We use a simple wrap layout for the heatmap to handle mobile gracefully */}
        <div className="flex flex-wrap gap-1 max-w-full justify-center">
          {days.map((day) => (
            <div
              key={day.date}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${getColor(day.count)} transition-all hover:ring-2 hover:ring-textPrimary`}
              title={`${day.date}: ${day.count} notes`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs text-textSecondary self-end">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-surfaceHover" />
          <div className="w-3 h-3 rounded-sm bg-accent/40" />
          <div className="w-3 h-3 rounded-sm bg-accent/60" />
          <div className="w-3 h-3 rounded-sm bg-accent/80" />
          <div className="w-3 h-3 rounded-sm bg-accent" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
