import { DiffResult } from "../../shared/DiffResult";
import { FileDiff } from "./FileDiff";
import { FileTree } from "./FileTree";
import { FilterBar, DiffState, StateCounts, STATES } from "./FilterBar";

export class DiffViewer {
    private listEl: HTMLElement;
    private statusEl: HTMLElement;
    private fileTree: FileTree;
    private filterBar: FilterBar;
    private items: FileDiff[] = [];

    private activeStates: Set<DiffState> = new Set(STATES);
    private searchPaths: Set<string> | null = null;
    private pathQuery: string | undefined = undefined;

    constructor() {
        this.listEl = document.getElementById("diff-list")!;
        this.statusEl = document.getElementById("status")!;
        this.fileTree = new FileTree();
        this.filterBar = new FilterBar((activeStates) => {
            this.activeStates = activeStates;
            this.updateVisibility();
        });
    }

    render(results: DiffResult[], versionA: string, versionB: string): void {
        this.listEl.innerHTML = "";
        this.searchPaths = null;
        this.pathQuery = undefined;
        this.filterBar.show();

        const counts: StateCounts = { added: 0, removed: 0, renamed: 0, edited: 0 };
        for (const r of results) counts[r.state]++;

        this.statusEl.textContent = `TOTAL ${results.length} CHANGES`;

        this.filterBar.setCounts(counts);

        this.items = results.map(r => new FileDiff(r, versionA, versionB));
        this.fileTree.render(this.items);

        for (const item of this.items) {
            this.listEl.appendChild(item.el);
        }

        this.updateVisibility();
    }

    applySearch(paths: Set<string> | null, pathQuery?: string): void {
        this.searchPaths = paths;
        this.pathQuery = pathQuery;
        this.updateVisibility();
    }

    private updateVisibility(): void {
        for (const item of this.items) {
            const path = item.result.state === "renamed" ? item.result.b.path : item.result.path;

            const visibleByFilter = this.activeStates.has(item.result.state as DiffState);

            const visibleBySearch = this.searchPaths === null || this.searchPaths.has(path);
            const visibleByPathQuery = !this.pathQuery || path.toLowerCase().includes(this.pathQuery.toLowerCase());

            item.el.style.display = visibleByFilter && visibleBySearch && visibleByPathQuery ? "" : "none";
        }
    }
}