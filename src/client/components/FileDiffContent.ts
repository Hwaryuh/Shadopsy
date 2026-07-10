import { DiffResult, DiffLine } from "../../shared/DiffResult";
import { DomComponent } from "../types";
import { DiffTable, EmptySide } from "./DiffTable";
import { resolveLang } from "../utils/highlight";
import { fetchContentDiff, fetchSingleContent } from "../api";
import { STATE_TEXT_COLORS, STATE_BG_COLORS } from "../utils/stateColor";

export class FileDiffContent implements DomComponent {
    readonly el: HTMLElement;

    constructor(private result: DiffResult, private versionA: string, private versionB: string) {
        this.el = document.createElement("div");
        this.el.className = "hidden";
    }

    async load(): Promise<void> {
        this.el.innerHTML = `<div class="px-4 py-4 font-mono text-control text-on-surface-variant/70 loading-pulse border-t border-outline-variant/40">Dissecting…</div>`;

        try {
            await this.fetchAndRender();
        } catch {
            this.el.innerHTML = `<div class="px-4 py-4 font-mono text-control text-error border-t border-outline-variant/40">Failed to load.</div>`;
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
        const stateColor = STATE_TEXT_COLORS[state];
        const stateBg = STATE_BG_COLORS[state];

        const { a: tableA, b: tableB } = DiffTable.of(lines, lang, emptySide);
        tableA.classList.add("font-mono", "text-code", "leading-relaxed");
        tableB.classList.add("font-mono", "text-code", "leading-relaxed");

        const makeVersionHeader = (version: string): HTMLElement => {
            const h = document.createElement("div");
            h.className = "flex items-center gap-2 px-4 py-1.5 text-version-label font-mono font-semibold tracking-[0.14em] uppercase bg-surface-container-low/60 border-b border-outline-variant/40";

            const dot = document.createElement("span");
            dot.className = `w-1.5 h-1.5 rounded-full shrink-0 ${stateBg}`;

            const label = document.createElement("span");
            label.className = stateColor;
            label.textContent = version;

            h.append(dot, label);
            return h;
        };

        const colA = document.createElement("div");
        colA.className = "border-r border-(--diff-split-border) overflow-hidden";
        colA.append(makeVersionHeader(this.versionA), tableA);

        const colB = document.createElement("div");
        colB.className = "overflow-hidden";
        colB.append(makeVersionHeader(this.versionB), tableB);

        const grid = document.createElement("div");
        grid.className = "grid grid-cols-2 border-t border-outline-variant/40";
        grid.append(colA, colB);

        this.el.innerHTML = "";
        this.el.appendChild(grid);
        DiffTable.synchronizeRowHeights(tableA, tableB);
    }
}