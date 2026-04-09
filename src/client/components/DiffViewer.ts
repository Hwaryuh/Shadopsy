import { DiffResult } from "../../shared/DiffResult";
import { FileDiff } from "./FileDiff";
import { FileTree } from "./FileTree";
import { FilterBar, DiffState, StateCounts } from "./FilterBar";

export class DiffViewer {
    private listEl: HTMLElement;
    private statusEl: HTMLElement;
    private fileTree: FileTree;
    private filterBar: FilterBar;
    private items: FileDiff[] = [];

    constructor() {
        this.listEl = document.getElementById("diff-list")!;
        this.statusEl = document.getElementById("status")!;
        this.fileTree = new FileTree();
        this.filterBar = new FilterBar((activeStates) => this.applyFilter(activeStates));
    }

    render(results: DiffResult[], versionA: string, versionB: string): void {
        this.listEl.innerHTML = "";
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
    }

    private applyFilter(activeStates: Set<DiffState>): void {
        for (const item of this.items) {
            const stateVisible = activeStates.has(item.result.state as DiffState);
            item.el.style.display = stateVisible ? "" : "none";
        }
    }

    applySearch(paths: Set<string> | null, pathQuery?: string): void {
        for (const item of this.items) {
            const path = item.result.state === "renamed" ? item.result.b.path : item.result.path;
            const visibleByPaths = paths === null || paths.has(path);
            const visibleByQuery = !pathQuery || path.toLowerCase().includes(pathQuery.toLowerCase());
            item.el.style.display = visibleByPaths && visibleByQuery ? "" : "none";
        }
    }
}