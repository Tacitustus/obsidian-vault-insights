import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NoteAggregate } from "@vault-insights/shared";
import { ArrowUpDown } from "lucide-react";

interface Props {
  notes: NoteAggregate[];
  searchQuery: string;
}

type SortField = "openCount" | "editCount" | "lastOpened" | "notePath";
type SortOrder = "asc" | "desc";

export function TopNotesTable({ notes, searchQuery }: Props) {
  const [sortField, setSortField] = useState<SortField>("openCount");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { t } = useTranslation();

  const filteredAndSorted = useMemo(() => {
    let result = notes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // tagsも検索対象に含める
      result = result.filter((n) => {
        const matchPath = n.notePath.toLowerCase().includes(q);
        const matchTag = n.tags && n.tags.some(tag => tag.toLowerCase().includes(q.replace(/^#/, '')));
        return matchPath || matchTag;
      });
    }

    return result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [notes, searchQuery, sortField, sortOrder]);

  // Pagination could be added here, showing top 50 for now
  const displayNotes = filteredAndSorted.slice(0, 50);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-bold text-textPrimary">{t("topNotes")}</h2>
        {searchQuery && (
          <span className="text-sm text-textSecondary">{t("searchMatchCount", { count: displayNotes.length })}</span>
        )}
      </div>

      <div className="overflow-x-auto premium-scrollbar max-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface/95 backdrop-blur-md z-10 shadow-sm border-b border-border">
            <tr>
              <Th
                label="Note Name"
                field="notePath"
                current={sortField}
                order={sortOrder}
                onClick={toggleSort}
              />
              <Th
                label={t("totalOpens")}
                field="openCount"
                current={sortField}
                order={sortOrder}
                onClick={toggleSort}
                align="right"
              />
              <Th
                label={t("totalEdits")}
                field="editCount"
                current={sortField}
                order={sortOrder}
                onClick={toggleSort}
                align="right"
              />
              <Th
                label="Last Accessed"
                field="lastOpened"
                current={sortField}
                order={sortOrder}
                onClick={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {displayNotes.length > 0 ? (
              displayNotes.map((note) => (
                <tr
                  key={note.noteId}
                  className="border-b border-border/50 hover:bg-surfaceHover transition-colors"
                >
                  <td className="px-4 py-3 text-textPrimary font-medium break-all">
                    {note.notePath || `${t("hidden")} ID:${note.noteId.slice(0, 6)}`}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-accent">{note.openCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-warning">{note.editCount}</td>
                  <td className="px-4 py-3 text-right text-textSecondary whitespace-nowrap">
                    {note.lastOpened === 0 ? "-" : new Date(note.lastOpened).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-textSecondary italic">
                  {t("noSearchResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, field, current, onClick, align = "left" }: any) {
  return (
    <th
      className={`px-4 py-3 font-medium text-textSecondary cursor-pointer hover:text-textPrimary select-none ${align === "right" ? "text-right" : ""}`}
      onClick={() => onClick(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        <ArrowUpDown
          size={14}
          className={`transition-opacity ${current === field ? "opacity-100 text-accent" : "opacity-30"}`}
        />
      </div>
    </th>
  );
}
