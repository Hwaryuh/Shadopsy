import { DiffResult } from "../../shared/DiffResult";
import { resolveFileIcon } from "../utils/fileIcon";

const STATE_COLORS: Record<string, string> = {
    edited:  "border-state-edited text-state-edited bg-state-edited-container/10",
    added:   "border-state-added text-state-added bg-state-added-container/10",
    removed: "border-state-removed text-state-removed bg-state-removed-container/10",
    renamed: "border-state-renamed text-state-renamed bg-state-renamed-container/10",
};

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
        header.className = `diff-file-header flex items-center justify-between px-6 py-3 bg-surface-container-highest border-l-4 ${STATE_COLORS[result.state]} cursor-pointer select-none hover:bg-surface-container transition-colors`;

        const left = document.createElement("div");
        left.className = "flex items-center gap-3";

        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined icon-card";
        const iconPath = result.state === "renamed" ? result.b.path : result.path;
        icon.textContent = resolveFileIcon(iconPath.split("/").pop() ?? iconPath);

        const pathWrap = document.createElement("span");

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

        left.append(icon, pathWrap);

        const badge = document.createElement("div");
        badge.className = `flex items-center gap-1.5 px-2 py-0.5 border font-mono text-badge tracking-widest uppercase cursor-pointer ${STATE_COLORS[result.state]}`;
        badge.textContent = result.state.toUpperCase();

        header.append(left, badge);
        return header;
    }
}