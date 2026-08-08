import { useState, useEffect } from "react";
import type { VaultIndex, VaultSnapshot } from "@vault-insights/shared";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { LoadingState, ErrorState } from "./States";

interface Props {
  vaultIndex: VaultIndex;
}

interface SummaryData {
  vaultId: string;
  label: string;
  noteCount: number;
  totalOpens: number;
  totalEdits: number;
}

export function CrossVaultSummary({ vaultIndex }: Props) {
  const [data, setData] = useState<SummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAllSnapshots = async () => {
      setLoading(true);
      try {
        const fetchPromises = vaultIndex.vaults.map(async (v) => {
          const res = await fetch(v.snapshotPath);
          if (!res.ok) throw new Error(`Failed to fetch ${v.label}`);
          const snapshot: VaultSnapshot = await res.json();
          return {
            vaultId: v.vaultId,
            label: v.label,
            noteCount: snapshot.totals.noteCount,
            totalOpens: snapshot.totals.totalOpens,
            totalEdits: snapshot.totals.totalEdits,
          } as SummaryData;
        });

        const results = await Promise.allSettled(fetchPromises);

        const successfulData: SummaryData[] = [];
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            successfulData.push(result.value);
          } else {
            console.error("Failed to load a vault snapshot:", result.reason);
          }
        });

        if (isMounted) {
          setData(successfulData);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load summary");
          setLoading(false);
        }
      }
    };

    fetchAllSnapshots();

    return () => {
      isMounted = false;
    };
  }, [vaultIndex]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const globalTotalNotes = data.reduce((sum, d) => sum + d.noteCount, 0);
  const globalTotalOpens = data.reduce((sum, d) => sum + d.totalOpens, 0);
  const globalTotalEdits = data.reduce((sum, d) => sum + d.totalEdits, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-textSecondary text-sm font-medium mb-1">Total Vaults</h3>
          <p className="text-3xl font-bold text-textPrimary">{data.length}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-textSecondary text-sm font-medium mb-1">Total Notes</h3>
          <p className="text-3xl font-bold text-textPrimary">{globalTotalNotes.toLocaleString()}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-textSecondary text-sm font-medium mb-1">Total Activity</h3>
          <p className="text-3xl font-bold text-textPrimary">
            {(globalTotalOpens + globalTotalEdits).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border">
        <h2 className="text-xl font-bold text-textPrimary mb-6">Vault Activity Comparison</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#888" tick={{ fill: "#888" }} />
              <YAxis stroke="#888" tick={{ fill: "#888" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", color: "#fff" }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend />
              <Bar dataKey="totalOpens" name="Opens" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalEdits" name="Edits" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
