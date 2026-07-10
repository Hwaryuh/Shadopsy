import { DiffResult } from "../../shared/DiffResult";
import { resolveFileIcon } from "../utils/fileIcon";
import { STATE_COLORS } from "../utils/stateColor";

function findDivergenceIndex(a: string[], b: string[]): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) return i;
    }
    return len;
}

const EXT_COLORS: Record<string, string> = {
    vsh:  "text-ext-vsh",
    fsh:  "text-ext-fsh",
    glsl: "text-ext-glsl",
    json: "text-ext-json",
};

function appendFileName(container: HTMLElement, fileName: string, baseClass: string): void {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex <= 0) {
        const span = document.createElement("span");
        span.className = baseClass;
        span.textContent = fileName;
        container.appendChild(span);
        return;
    }

    const extKey = fileName.substring(dotIndex + 1).toLowerCase();
    const extColor = EXT_COLORS[extKey] ?? "opacity-50";

    const stem = document.createElement("span");
    stem.className = baseClass;
    stem.textContent = fileName.substring(0, dotIndex);

    const ext = document.createElement("span");
    ext.className = `font-mono text-path ${extColor}`;
    ext.textContent = fileName.substring(dotIndex);

    container.append(stem, ext);
}

function buildPathSpans(
    segments: string[],
    divergeAt: number,
    suffix: string,
    dimClass: string,
    normalClass: string,
    highlightClass: string,
): HTMLElement[] {
    const commonSegs = segments.slice(0, divergeAt);
    const changedSegs = segments.slice(divergeAt);

    const spans: HTMLElement[] = [];

    if (commonSegs.length > 0) {
        const common = document.createElement("span");
        common.className = `font-mono text-path ${dimClass}`;
        common.textContent = commonSegs.join("/") + "/";
        spans.push(common);
    }

    if (changedSegs.length > 0) {
        const dirSegs = changedSegs.slice(0, -1);
        const fileName = changedSegs[changedSegs.length - 1];

        if (dirSegs.length > 0) {
            const changedDir = document.createElement("span");
            changedDir.className = `font-mono text-path ${highlightClass}`;
            changedDir.textContent = dirSegs.join("/") + "/";
            spans.push(changedDir);
        }

        const fileWrap = document.createElement("span");
        appendFileName(fileWrap, fileName, `font-mono text-path ${normalClass}`);

        if (suffix) {
            const suffixSpan = document.createElement("span");
            suffixSpan.className = `font-mono text-path ${normalClass}`;
            suffixSpan.textContent = suffix;
            fileWrap.appendChild(suffixSpan);
        }

        spans.push(fileWrap);
    }

    return spans;
}

export class FileDiffHeader {
    static of(result: DiffResult): HTMLElement {
        const header = document.createElement("div");
        header.className = `diff-file-header flex items-center justify-between gap-4 px-4 py-2.5 border-l-[3px] ${STATE_COLORS[result.state]} cursor-pointer select-none hover:bg-surface-container-low transition-colors`;

        const left = document.createElement("div");
        left.className = "flex items-center gap-2.5 min-w-0";

        const chevron = document.createElement("span");
        chevron.className = "diff-chevron material-symbols-outlined icon-tree text-on-surface-variant/50 shrink-0";
        chevron.textContent = "chevron_right";

        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined icon-card";
        const iconPath = result.state === "renamed" ? result.b.path : result.path;
        icon.textContent = resolveFileIcon(iconPath.split("/").pop() ?? iconPath);

        const pathWrap = document.createElement("span");
        pathWrap.className = "min-w-0 truncate whitespace-nowrap";

        if (result.state === "renamed") {
            const fromSegs = result.a.path.split("/");
            const toSegs = result.b.path.split("/");
            const divergeAt = findDivergenceIndex(fromSegs, toSegs);

            const fromSpans = buildPathSpans(
                fromSegs, divergeAt, " → ",
                "text-on-surface-variant/50",
                "text-on-surface",
                "text-state-renamed",
            );
            const toSpans = buildPathSpans(
                toSegs, divergeAt, "",
                "text-on-surface-variant/50",
                "text-on-surface",
                "text-state-renamed",
            );

            pathWrap.append(...fromSpans, ...toSpans);
        } else {
            const fullPath = result.path;
            const fileName = fullPath.substring(fullPath.lastIndexOf("/") + 1);

            const dir = document.createElement("span");
            dir.className = "font-mono text-path text-on-surface-variant/50";
            dir.textContent = fullPath.substring(0, fullPath.lastIndexOf("/") + 1);

            const fileWrap = document.createElement("span");
            appendFileName(fileWrap, fileName, "font-mono text-path text-on-surface");

            pathWrap.append(dir, fileWrap);
        }

        left.append(chevron, icon, pathWrap);

        const badge = document.createElement("div");
        badge.className = `flex items-center shrink-0 px-2.5 py-0.5 rounded-full border font-mono text-badge font-medium tracking-[0.1em] uppercase ${STATE_COLORS[result.state]}`;
        badge.textContent = result.state.toUpperCase();

        header.append(left, badge);
        return header;
    }
}