import { Activity, FileText, Edit2 } from "lucide-react";
import type { Totals } from "@vault-insights/shared";

interface Props {
  totals: Totals;
}

export function SummaryCards({ totals }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card
        title="Total Notes"
        value={totals.noteCount}
        icon={<FileText size={24} />}
        color="text-accent"
      />
      <Card
        title="Total Opens"
        value={totals.totalOpens}
        icon={<Activity size={24} />}
        color="text-success"
      />
      <Card
        title="Total Edits"
        value={totals.totalEdits}
        icon={<Edit2 size={24} />}
        color="text-warning"
      />
    </div>
  );
}

function Card({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass-panel p-6 flex items-center gap-5">
      <div className={`p-4 rounded-full bg-surface ${color}`}>{icon}</div>
      <div>
        <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="text-3xl font-bold text-textPrimary leading-none">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
