import { useMemo } from "react";
import type { NoteAggregate } from "@vault-insights/shared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  notes: NoteAggregate[];
}

export function TagBreakdownChart({ notes }: Props) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ name: tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 tags
  }, [notes]);

  if (data.length === 0) {
    return (
      <div className="glass-panel p-5 flex flex-col items-center justify-center h-[350px]">
        <p className="text-textSecondary italic">No tags found in the current vault.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 flex flex-col h-[350px]">
      <h2 className="text-lg font-bold text-textPrimary mb-4">Top Tags</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#c9d1d9", fontSize: 13 }} 
              width={100}
            />
            <Tooltip 
              cursor={{ fill: "#21262d" }}
              contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", borderRadius: "8px" }}
              itemStyle={{ color: "#58a6ff" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill="#58a6ff" fillOpacity={0.8 + (0.2 * (data.length - index)/data.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
