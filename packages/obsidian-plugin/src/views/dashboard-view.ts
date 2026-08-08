import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type VaultInsightsPlugin from "../main";
import { aggregateEvents } from "../core/aggregator";
import {
  filterAndSortNotes,
  getTopOpenedNotes,
  getUnopenedNotes,
  getTagCounts,
  type SortField,
  type SortOrder,
  type FilterOptions,
} from "../core/dashboard-logic";
import type { NoteAggregate } from "@vault-insights/shared";

export const DASHBOARD_VIEW_TYPE = "vault-insights-dashboard";

export class DashboardView extends ItemView {
  private plugin: VaultInsightsPlugin;
  
  // UI State
  private sortField: SortField = "openCount";
  private sortOrder: SortOrder = "desc";
  private filterOpts: FilterOptions = { searchQuery: "" };

  constructor(leaf: WorkspaceLeaf, plugin: VaultInsightsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Vault Insights";
  }
  
  getIcon(): string {
    return "bar-chart-2";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }

  private render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    
    // Add main class for styling
    container.addClass("vault-insights-dashboard");
    
    // Fetch and aggregate data
    const events = this.plugin.getEvents();
    const allNotes = aggregateEvents([...events]);
    
    // Calculate total stats
    const totalOpens = allNotes.reduce((sum, n) => sum + n.openCount, 0);
    const totalEdits = allNotes.reduce((sum, n) => sum + n.editCount, 0);

    // Header
    const header = container.createEl("div", { cls: "vi-header" });
    header.createEl("h2", { text: "Vault Insights" });
    const refreshBtn = header.createEl("button", { cls: "vi-refresh-btn" });
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => this.render());

    // Summary Cards
    const summaryContainer = container.createEl("div", { cls: "vi-summary-cards" });
    this.createSummaryCard(summaryContainer, "総ノート数", allNotes.length.toString(), "files");
    this.createSummaryCard(summaryContainer, "総オープン数", totalOpens.toString(), "eye");
    this.createSummaryCard(summaryContainer, "総編集数", totalEdits.toString(), "edit-2");

    // Two-column layout
    const grid = container.createEl("div", { cls: "vi-grid" });

    // Left Column: Main List (Top notes / All notes filtered)
    const leftCol = grid.createEl("div", { cls: "vi-col" });
    this.renderMainList(leftCol, allNotes);

    // Right Column: Unopened Notes & Tag Chart
    const rightCol = grid.createEl("div", { cls: "vi-col" });
    
    // Top 10 Opened Notes (Quick view)
    const topOpened = getTopOpenedNotes(allNotes, 10);
    this.renderTopNotesCard(rightCol, topOpened);
    
    // Unopened Notes
    const unopened = getUnopenedNotes(allNotes);
    this.renderUnopenedNotesCard(rightCol, unopened);
    
    // Tag Chart
    const tagCounts = getTagCounts(allNotes);
    this.renderTagChartCard(rightCol, tagCounts);
  }

  private createSummaryCard(parent: HTMLElement, title: string, value: string, icon: string) {
    const card = parent.createEl("div", { cls: "vi-card vi-summary-card" });
    const iconEl = card.createEl("div", { cls: "vi-summary-icon" });
    setIcon(iconEl, icon);
    
    const content = card.createEl("div", { cls: "vi-summary-content" });
    content.createEl("div", { cls: "vi-summary-title", text: title });
    content.createEl("div", { cls: "vi-summary-value", text: value });
  }

  private renderMainList(parent: HTMLElement, allNotes: NoteAggregate[]) {
    const card = parent.createEl("div", { cls: "vi-card vi-main-list" });
    
    const header = card.createEl("div", { cls: "vi-card-header" });
    header.createEl("h3", { text: "ノート一覧" });
    
    // Controls: Search & Sort
    const controls = card.createEl("div", { cls: "vi-controls" });
    
    const searchInput = controls.createEl("input", { 
      type: "text", 
      placeholder: "ノートを検索...",
      cls: "vi-search-input"
    });
    searchInput.value = this.filterOpts.searchQuery;
    searchInput.addEventListener("input", (e) => {
      this.filterOpts.searchQuery = (e.target as HTMLInputElement).value;
      this.updateMainListContent(listContainer, allNotes);
    });

    const sortSelect = controls.createEl("select", { cls: "vi-sort-select" });
    const options = [
      { val: "openCount-desc", label: "オープン数 (多い順)" },
      { val: "openCount-asc", label: "オープン数 (少ない順)" },
      { val: "editCount-desc", label: "編集数 (多い順)" },
      { val: "lastOpened-desc", label: "最後に開いた日時" },
      { val: "notePath-asc", label: "ノート名 (A-Z)" }
    ];
    options.forEach(opt => {
      const optionEl = sortSelect.createEl("option", { text: opt.label, value: opt.val });
      if (this.sortField + "-" + this.sortOrder === opt.val) {
        optionEl.selected = true;
      }
    });
    sortSelect.addEventListener("change", (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const [field, order] = val.split("-");
      this.sortField = field as SortField;
      this.sortOrder = order as SortOrder;
      this.updateMainListContent(listContainer, allNotes);
    });

    // List Container
    const listContainer = card.createEl("div", { cls: "vi-list-container" });
    this.updateMainListContent(listContainer, allNotes);
  }

  private updateMainListContent(container: HTMLElement, allNotes: NoteAggregate[]) {
    container.empty();
    
    const displayNotes = filterAndSortNotes(
      allNotes, 
      this.filterOpts, 
      this.sortField, 
      this.sortOrder
    );

    if (displayNotes.length === 0) {
      container.createEl("div", { cls: "vi-empty-state", text: "ノートが見つかりません" });
      return;
    }

    const table = container.createEl("table", { cls: "vi-table" });
    const thead = table.createEl("thead");
    const tr = thead.createEl("tr");
    tr.createEl("th", { text: "ノート名" });
    tr.createEl("th", { text: "オープン" });
    tr.createEl("th", { text: "編集" });
    tr.createEl("th", { text: "最終アクセス" });

    const tbody = table.createEl("tbody");
    displayNotes.forEach(note => {
      const row = tbody.createEl("tr");
      
      const nameCell = row.createEl("td", { cls: "vi-td-name" });
      // If privacy mode is on, notePath might be empty
      nameCell.setText(note.notePath || `(Hidden) ${note.noteId.slice(0, 8)}`);
      
      row.createEl("td", { text: note.openCount.toString(), cls: "vi-td-num" });
      row.createEl("td", { text: note.editCount.toString(), cls: "vi-td-num" });
      
      const lastAccessed = note.lastOpened === 0 
        ? "-" 
        : new Date(note.lastOpened).toLocaleDateString();
      row.createEl("td", { text: lastAccessed, cls: "vi-td-date" });
    });
  }

  private renderTopNotesCard(parent: HTMLElement, topNotes: NoteAggregate[]) {
    const card = parent.createEl("div", { cls: "vi-card" });
    card.createEl("h3", { text: "よく開くノート Top 10", cls: "vi-card-header" });
    
    if (topNotes.length === 0) {
      card.createEl("div", { cls: "vi-empty-state", text: "データがありません" });
      return;
    }

    const list = card.createEl("div", { cls: "vi-compact-list" });
    topNotes.forEach((note, index) => {
      const item = list.createEl("div", { cls: "vi-compact-list-item" });
      item.createEl("span", { cls: "vi-rank", text: `#${index + 1}` });
      item.createEl("span", { cls: "vi-name", text: note.notePath || `ID:${note.noteId.slice(0,6)}` });
      item.createEl("span", { cls: "vi-count", text: `${note.openCount} views` });
    });
  }

  private renderUnopenedNotesCard(parent: HTMLElement, unopened: NoteAggregate[]) {
    const card = parent.createEl("div", { cls: "vi-card" });
    card.createEl("h3", { text: "未オープンのノート", cls: "vi-card-header" });
    
    if (unopened.length === 0) {
      card.createEl("div", { cls: "vi-empty-state", text: "すべて閲覧済みです！" });
      return;
    }

    const list = card.createEl("div", { cls: "vi-compact-list vi-unopened-list" });
    // Show top 20 max to avoid DOM bloat
    const displayUnopened = unopened.slice(0, 20);
    displayUnopened.forEach(note => {
      const item = list.createEl("div", { cls: "vi-compact-list-item" });
      const icon = item.createEl("span", { cls: "vi-icon" });
      setIcon(icon, "file");
      item.createEl("span", { cls: "vi-name", text: note.notePath || `ID:${note.noteId.slice(0,6)}` });
    });
    
    if (unopened.length > 20) {
      list.createEl("div", { 
        cls: "vi-compact-list-item vi-more", 
        text: `他 ${unopened.length - 20} 件...` 
      });
    }
  }

  private renderTagChartCard(parent: HTMLElement, tagCounts: { tag: string; count: number; maxCount: number }[]) {
    const card = parent.createEl("div", { cls: "vi-card" });
    card.createEl("h3", { text: "タグ別統計", cls: "vi-card-header" });
    
    if (tagCounts.length === 0) {
      card.createEl("div", { cls: "vi-empty-state", text: "タグが見つかりません" });
      return;
    }

    const chart = card.createEl("div", { cls: "vi-tag-chart" });
    tagCounts.slice(0, 10).forEach(({ tag, count, maxCount }) => {
      const row = chart.createEl("div", { cls: "vi-tag-row" });
      row.createEl("div", { cls: "vi-tag-label", text: tag });
      
      const barContainer = row.createEl("div", { cls: "vi-bar-container" });
      const bar = barContainer.createEl("div", { cls: "vi-bar" });
      const percentage = Math.max(5, Math.round((count / maxCount) * 100));
      bar.style.width = `${percentage}%`;
      
      row.createEl("div", { cls: "vi-tag-count", text: count.toString() });
    });
  }
}
