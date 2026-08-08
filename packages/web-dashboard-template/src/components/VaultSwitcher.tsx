import type { VaultIndex } from "@vault-insights/shared";
import { Folder } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  vaultIndex: VaultIndex;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VaultSwitcher({ vaultIndex, selectedId, onSelect }: Props) {
  const { t } = useTranslation();

  if (vaultIndex.vaults.length <= 1) {
    // 1つしかない場合は単なるタイトル表示
    const name = vaultIndex.vaults[0]?.label || t("dashboard");
    return (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/20 text-accent rounded-lg">
          <Folder size={20} />
        </div>
        <h1 className="text-xl font-bold text-textPrimary">{name}</h1>
      </div>
    );
  }

  // 複数ある場合はタブ切り替え
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/20 text-accent rounded-lg">
          <Folder size={20} />
        </div>
        <h1 className="text-xl font-bold text-textPrimary hidden md:block">{t("vaults")}:</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect("__summary__")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            selectedId === "__summary__"
              ? "bg-accent text-white shadow-md shadow-accent/20"
              : "bg-surface text-textSecondary hover:bg-surfaceHover hover:text-textPrimary"
          }`}
        >
          {t("overallSummary")}
        </button>
        {vaultIndex.vaults.map((v: VaultIndex["vaults"][number]) => (
          <button
            key={v.vaultId}
            onClick={() => onSelect(v.vaultId)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedId === v.vaultId
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "bg-surface text-textSecondary hover:bg-surfaceHover hover:text-textPrimary"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
