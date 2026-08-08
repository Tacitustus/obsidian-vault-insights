import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      dashboard: "Vault Insights Dashboard",
      overallSummary: "Overall Summary",
      vaults: "Vaults",
      noData: "No data available",
      unopenedNotes: "Unopened Notes",
      allRead: "All notes read!",
      otherCount: "Other {{count}} notes...",
      topNotes: "Top 10 Opened Notes",
      views: "views",
      tags: "Tags",
      links: "Links",
      noteCount: "Note Count",
      totalOpens: "Total Opens",
      totalEdits: "Total Edits",
      avgOpens: "Avg Opens/Note",
      avgEdits: "Avg Edits/Note",
      searchPlaceholder: "Search by note name or #tag...",
      searchMatchCount: "{{count}} notes found",
      searchResult: "Search Result",
      noSearchResults: "No notes matched your search.",
      hidden: "(Hidden)",
      syncTime: "Generated At",
      unknown: "Unknown",
      totalVaults: "Total Vaults",
      totalActivity: "Total Activity",
      vaultActivityComparison: "Vault Activity Comparison",
      noDataYet: "No Data Available Yet",
      setupInstruction: 'If you just set up Vault Insights, please use the "Export snapshot as JSON" command inside Obsidian to generate and sync your first dataset.',
      unableToLoad: "Unable to Load Dashboard",
      loading: "Loading Vault Insights...",
      topTags: "Top Tags",
      noTagsFound: "No tags found in the current vault.",
      activityHeatmap: "Activity (Last Accessed)",
      less: "Less",
      more: "More",
    },
  },
  ja: {
    translation: {
      dashboard: "Vault Insights ダッシュボード",
      overallSummary: "全体サマリー",
      vaults: "ヴォールト",
      noData: "データがありません",
      unopenedNotes: "未オープンのノート",
      allRead: "すべて閲覧済みです！",
      otherCount: "他 {{count}} 件...",
      topNotes: "よく開くノート Top 10",
      views: "views",
      tags: "タグ",
      links: "リンク",
      noteCount: "総ノート数",
      totalOpens: "総オープン数",
      totalEdits: "総編集回数",
      avgOpens: "平均オープン数/ノート",
      avgEdits: "平均編集回数/ノート",
      searchPlaceholder: "ノート名や #タグ で検索...",
      searchMatchCount: "{{count}} 件ヒット",
      searchResult: "検索結果",
      noSearchResults: "検索条件に一致するノートはありません。",
      hidden: "(Hidden)",
      syncTime: "データ生成日時",
      unknown: "不明",
      totalVaults: "総ヴォールト数",
      totalActivity: "総アクティビティ",
      vaultActivityComparison: "ヴォールト別アクティビティ比較",
      noDataYet: "まだデータがありません",
      setupInstruction: "Obsidian内で「Export snapshot as JSON」コマンドを実行して、最初のデータを生成・同期してください。",
      unableToLoad: "ダッシュボードを読み込めません",
      loading: "Vault Insightsを読み込み中...",
      topTags: "トップタグ",
      noTagsFound: "現在のヴォールトにタグが見つかりません。",
      activityHeatmap: "アクティビティ (最終アクセス)",
      less: "少",
      more: "多",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    // デフォルト言語を英語にする。ブラウザの言語がjaならjaを使う
    lng: navigator.language.startsWith("ja") ? "ja" : "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
