import { useState, useEffect } from "react";
import { validateSnapshot, type VaultIndex, type VaultSnapshot } from "@vault-insights/shared";

export type DataState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty" }
  | { status: "success"; data: T };

export function useVaultData() {
  const [vaultIndex, setVaultIndex] = useState<DataState<VaultIndex>>({ status: "loading" });
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DataState<VaultSnapshot>>({ status: "loading" });

  // 1. Fetch Vault Index
  useEffect(() => {
    let isMounted = true;
    const fetchIndex = async () => {
      try {
        const res = await fetch("/vaults/index.json");
        if (!res.ok) {
          if (res.status === 404) {
            // 初回デプロイ直後など
            if (isMounted) setVaultIndex({ status: "empty" });
            return;
          }
          throw new Error(`Failed to fetch index: ${res.statusText}`);
        }

        const data = await res.json();
        // 簡易的な検証 (実装をシンプルに保つため型キャストか、後で共有スキーマで検証)
        if (data && Array.isArray(data.vaults) && data.vaults.length > 0) {
          if (isMounted) {
            setVaultIndex({ status: "success", data: data as VaultIndex });
            setSelectedVaultId(data.vaults[0].vaultId);
          }
        } else {
          if (isMounted) setVaultIndex({ status: "empty" });
        }
      } catch (err) {
        if (isMounted)
          setVaultIndex({
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          });
      }
    };

    fetchIndex();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Snapshot for Selected Vault
  useEffect(() => {
    if (!selectedVaultId || selectedVaultId === "__summary__") return;

    let isMounted = true;
    const fetchSnapshot = async () => {
      setSnapshot({ status: "loading" });
      try {
        // VaultIdはエンコードしておく
        const res = await fetch(`/vaults/${encodeURIComponent(selectedVaultId)}/snapshot.json`);

        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) setSnapshot({ status: "empty" });
            return;
          }
          throw new Error(`Failed to fetch snapshot: ${res.statusText}`);
        }

        const rawData = await res.json();

        // Zod を使ってパース＆バリデーション
        const validation = validateSnapshot(rawData);

        if (!validation.success) {
          console.error("Snapshot validation failed:", validation.error);
          throw new Error("Invalid snapshot format");
        }

        if (isMounted) {
          setSnapshot({ status: "success", data: validation.data });
        }
      } catch (err) {
        if (isMounted) {
          setSnapshot({
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    };

    fetchSnapshot();
    return () => {
      isMounted = false;
    };
  }, [selectedVaultId]);

  return {
    vaultIndex,
    selectedVaultId,
    setSelectedVaultId,
    snapshot,
  };
}
