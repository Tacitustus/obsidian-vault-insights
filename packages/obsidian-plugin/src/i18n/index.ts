import { moment } from "obsidian";

const en = {
  dashboard: "Vault Insights Dashboard",
  totalNotes: "Total Notes",
  totalOpens: "Total Opens",
  totalEdits: "Total Edits",
  noteList: "Note List",
  searchNotes: "Search notes by name or #tag...",
  sortOpenDesc: "Opens (High to Low)",
  sortOpenAsc: "Opens (Low to High)",
  sortEditDesc: "Edits (High to Low)",
  sortLastAccessed: "Last Accessed",
  sortNameAsc: "Note Name (A-Z)",
  noNotesFound: "No notes found matching your criteria.",
  colNoteName: "Note Name",
  colOpen: "Opens",
  colEdit: "Edits",
  colAccessed: "Last Accessed",
  topNotes: "Top 10 Opened Notes",
  noData: "No data available",
  unopenedNotes: "Unopened Notes",
  allRead: "All notes read!",
  otherNotes: "Other {{count}} notes...",
  tagStats: "Tag Statistics",
  noTags: "No tags found",
  hidden: "(Hidden)",
};

const ja: typeof en = {
  dashboard: "Vault Insights ダッシュボード",
  totalNotes: "総ノート数",
  totalOpens: "総オープン数",
  totalEdits: "総編集数",
  noteList: "ノート一覧",
  searchNotes: "ノート名や #タグ で検索...",
  sortOpenDesc: "オープン数 (多い順)",
  sortOpenAsc: "オープン数 (少ない順)",
  sortEditDesc: "編集数 (多い順)",
  sortLastAccessed: "最後に開いた日時",
  sortNameAsc: "ノート名 (A-Z)",
  noNotesFound: "ノートが見つかりません",
  colNoteName: "ノート名",
  colOpen: "オープン",
  colEdit: "編集",
  colAccessed: "最終アクセス",
  topNotes: "よく開くノート Top 10",
  noData: "データがありません",
  unopenedNotes: "未オープンのノート",
  allRead: "すべて閲覧済みです！",
  otherNotes: "他 {{count}} 件...",
  tagStats: "タグ別統計",
  noTags: "タグが見つかりません",
  hidden: "(Hidden)",
};

export function t(key: keyof typeof en, vars?: Record<string, string | number>): string {
  const locale = moment.locale();
  // デフォルトは英語、jaなら日本語
  const strings = locale === "ja" ? ja : en;
  let text = strings[key] || en[key] || key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{{${k}}}`, String(v));
    }
  }

  return text;
}
