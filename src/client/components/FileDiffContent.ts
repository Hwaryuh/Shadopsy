import { DiffResult } from "../../shared/DiffResult";
import { DomComponent } from "../types";
import { DiffTable, EmptySide } from "./DiffTable";
import { resolveLang } from "../utils/highlight";
import { fetchContentDiff, fetchSingleContent } from "../api";

export class FileDiffContent implements DomComponent {
    readonly el: HTMLElement;

    constructor(private result: DiffResult, private versionA: string, private versionB: string) {
        this.el = document.createElement("div");
        this.el.className = "hidden";
    }

    async load(): Promise<void> {
        this.el.innerHTML = `<div class="px-6 py-4 font-mono text-control text-on-surface-variant">Loading...</div>`;

        try {
            await this.fetchAndRender();
        } catch {
            this.el.innerHTML = `<div class="px-6 py-4 font-mono text-control text-error">Failed to load.</div>`;
        }
    }

    private async fetchAndRender(): Promise<void> {
        const state = this.result.state;

        if (state === "added") {
            const lines = await fetchSingleContent(this.versionB, this.result.path, "b");
            this.renderSplitView(lines, this.result.path, "a");
            return;
        }

        if (state === "removed") {
            const lines = await fetchSingleContent(this.versionA, this.result.path, "a");
            this.renderSplitView(lines, this.result.path, "b");
            return;
        }

        const pathA = state === "renamed" ? this.result.a.path : this.result.path;
        const pathB = state === "renamed" ? this.result.b.path : this.result.path;
        const lines = await fetchContentDiff(this.versionA, this.versionB, pathA, pathB);
        this.renderSplitView(lines, pathB, null);
    }

    private renderSplitView(lines: DiffLine[], path: string, emptySide: EmptySide): void {
        const lang = resolveLang(path);
        const state = this.result.state;
        const stateColor = `text-state-${state}`;

        const { a: tableA, b: tableB } = DiffTable.of(lines, lang, emptySide);
        tableA.classList.add("font-mono", "text-code", "leading-relaxed");
        tableB.classList.add("font-mono", "text-code", "leading-relaxed");

        const colA = document.createElement("div");
        colA.className = "border-r border-outline-variant/10 overflow-hidden";
        const headerA = document.createElement("div");
        headerA.className = `px-4 py-2 text-version-label font-black tracking-widest ${stateColor} uppercase bg-surface-container-low border-b border-outline-variant/10`;
        headerA.textContent = this.versionA;
        colA.append(headerA, tableA);

        const colB = document.createElement("div");
        colB.className = "overflow-hidden";
        const headerB = document.createElement("div");
        headerB.className = `px-4 py-2 text-version-label font-black tracking-widest ${stateColor} uppercase bg-surface-container-low border-b border-outline-variant/10`;
        headerB.textContent = this.versionB;
        colB.append(headerB, tableB);

        const grid = document.createElement("div");
        grid.className = "grid grid-cols-2";
        grid.append(colA, colB);

        this.el.innerHTML = "";
        this.el.appendChild(grid);
        DiffTable.synchronizeRowHeights(tableA, tableB);
    }
}