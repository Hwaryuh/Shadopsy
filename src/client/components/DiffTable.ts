import { DiffLine } from "../../shared/DiffResult";
import { highlight } from "../utils/highlight";

export type EmptySide = "a" | "b" | null;

interface SplitTable {
    a: HTMLElement;
    b: HTMLElement;
}

export class DiffTable {
    static of(lines: DiffLine[], lang: string | null, emptySide: EmptySide = null): SplitTable {
        const tbodyA = document.createElement("tbody");
        const tbodyB = document.createElement("tbody");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Side A
            const trA = document.createElement("tr");
            trA.dataset.row = String(i);
            const lineNumA = emptySide === "a" ? line.lineB : line.lineA;

            const tdNumA = document.createElement("td");
            tdNumA.className = "w-12 text-right pr-4 select-none border-r border-outline-variant/10 text-line-num bg-surface-container-low/30 text-on-surface-variant/50";
            tdNumA.textContent = lineNumA !== null ? String(lineNumA) : "";

            const tdTextA = document.createElement("td");
            tdTextA.className = "px-4 py-0.5 whitespace-pre-wrap break-all text-on-surface-variant";

            if (emptySide === "a") {
                tdTextA.innerHTML = "&nbsp;";
                tdNumA.classList.add("bg-surface-container-highest");
                tdTextA.classList.add("bg-surface-container-highest", "select-none");
            } else if (line.textA === null) {
                tdTextA.innerHTML = "&nbsp;";
                tdTextA.classList.add("select-none");
                trA.classList.add("diff-line-empty-a");
            } else {
                if (line.type === "removed") trA.classList.add("diff-line-removed");
                tdTextA.innerHTML = highlight(line.textA, lang);
            }

            trA.append(tdNumA, tdTextA);
            tbodyA.appendChild(trA);

            // Side B
            const trB = document.createElement("tr");
            trB.dataset.row = String(i);
            const lineNumB = emptySide === "b" ? line.lineA : line.lineB;

            const tdNumB = document.createElement("td");
            tdNumB.className = "w-12 text-right pr-4 select-none border-r border-outline-variant/10 text-line-num bg-surface-container-low/30 text-on-surface-variant/50";
            tdNumB.textContent = lineNumB !== null ? String(lineNumB) : "";

            const tdTextB = document.createElement("td");
            tdTextB.className = "px-4 py-0.5 whitespace-pre-wrap break-all text-on-surface-variant";

            if (emptySide === "b") {
                tdTextB.innerHTML = "&nbsp;";
                tdNumB.classList.add("bg-surface-container-highest");
                tdTextB.classList.add("bg-surface-container-highest", "select-none");
            } else if (line.textB === null) {
                tdTextB.innerHTML = "&nbsp;";
                tdTextB.classList.add("select-none");
                trB.classList.add("diff-line-empty-b");
            } else {
                if (line.type === "added") trB.classList.add("diff-line-added");
                tdTextB.innerHTML = highlight(line.textB, lang);
            }

            trB.append(tdNumB, tdTextB);
            tbodyB.appendChild(trB);
        }

        return {
            a: DiffTable.wrapTable(tbodyA),
            b: DiffTable.wrapTable(tbodyB),
        };
    }

    static synchronizeRowHeights(a: HTMLElement, b: HTMLElement): void {
        const rowsA = a.querySelectorAll<HTMLTableRowElement>("tr[data-row]");
        const rowsB = b.querySelectorAll<HTMLTableRowElement>("tr[data-row]");

        rowsA.forEach((trA, i) => {
            const trB = rowsB[i];
            if (!trB) return;
            const height = Math.max(trA.getBoundingClientRect().height, trB.getBoundingClientRect().height);
            trA.style.height = `${height}px`;
            trB.style.height = `${height}px`;
        });
    }

    private static wrapTable(tbody: HTMLTableSectionElement): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "overflow-x-auto";

        const table = document.createElement("table");
        table.className = "w-full border-collapse table-fixed";
        table.appendChild(tbody);
        wrap.appendChild(table);
        return wrap;
    }
}