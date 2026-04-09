import { FileDiff } from "./FileDiff";
import { resolveFileIcon } from "../utils/fileIcon";

interface TreeNode {
    children: Map<string, TreeNode>;
    fileDiff: FileDiff | null;
    el?: HTMLElement;
}

function buildTree(items: FileDiff[]): TreeNode {
    const root: TreeNode = { children: new Map(), fileDiff: null };

    for (const item of items) {
        const result = item.result;
        const path = result.state === "renamed" ? result.b.path : result.path;
        const parts = path.split("/");

        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node.children.has(parts[i])) {
                node.children.set(parts[i], { children: new Map(), fileDiff: null });
            }
            node = node.children.get(parts[i])!;
        }

        const fileName = parts[parts.length - 1];
        node.children.set(fileName, { children: new Map(), fileDiff: item });
    }

    return root;
}

const STATE_COLOR: Record<string, string> = {
    edited:  "text-state-edited",
    added:   "text-state-added",
    removed: "text-state-removed",
    renamed: "text-state-renamed",
};

function renderNode(name: string, node: TreeNode, depth: number): HTMLElement {
    const wrapper = document.createElement("div");

    if (node.fileDiff) {
        const state = node.fileDiff.result.state;
        const row = document.createElement("div");
        row.className = `flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-surface-container-high transition-colors`;
        row.style.paddingLeft = `${depth * 12 + 8}px`;

        const icon = document.createElement("span");
        icon.className = `material-symbols-outlined icon-tree ${STATE_COLOR[state]}`;
        icon.textContent = resolveFileIcon(name);

        const label = document.createElement("span");
        label.className = `font-mono text-tree tracking-wide ${STATE_COLOR[state]}`;
        label.textContent = name;

        row.append(icon, label);
        row.addEventListener("click", () => {
            const navHeight = document.querySelector("nav")?.offsetHeight ?? 0;
            const diffList = document.getElementById("diff-list");
            const gap = diffList ? parseFloat(getComputedStyle(diffList).gap) / 2 : 0;
            const top = node.fileDiff!.el.getBoundingClientRect().top + window.scrollY - navHeight - gap;
            window.scrollTo({ top, behavior: "smooth" });

            const el = node.fileDiff!.el;
            el.classList.remove("card-highlight");

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    void el.offsetWidth;
                    el.classList.add("card-highlight");
                    el.addEventListener("animationend", () => el.classList.remove("card-highlight"), { once: true });
                }
            }, { threshold: 0.1 });

            observer.observe(el);
        });

        wrapper.appendChild(row);
    } else {
        let collapsed = false;

        const header = document.createElement("div");
        header.className = "flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-surface-container-high transition-colors select-none";
        header.style.paddingLeft = `${depth * 12 + 8}px`;

        const arrow = document.createElement("span");
        arrow.className = "material-symbols-outlined icon-tree text-on-surface-variant";
        arrow.textContent = "keyboard_arrow_down";

        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined icon-tree text-on-surface-variant";
        icon.textContent = "folder_open";

        const label = document.createElement("span");
        label.className = "font-mono text-tree tracking-wide text-on-surface-variant/70";
        label.textContent = name;

        header.append(arrow, icon, label);

        const childrenEl = document.createElement("div");
        for (const [childName, childNode] of node.children) {
            childrenEl.appendChild(renderNode(childName, childNode, depth + 1));
        }

        header.addEventListener("click", () => {
            collapsed = !collapsed;
            childrenEl.style.display = collapsed ? "none" : "";
            arrow.textContent = collapsed ? "keyboard_arrow_right" : "keyboard_arrow_down";
            icon.textContent = collapsed ? "folder" : "folder_open";
        });

        wrapper.append(header, childrenEl);
    }

    return wrapper;
}

export type SortMode = "alpha" | "ext" | "state";

const STATE_ORDER: Record<string, number> = {
    edited:  0,
    added:   1,
    renamed: 2,
    removed: 3,
};

function getPath(item: FileDiff): string {
    const r = item.result;
    return r.state === "renamed" ? r.b.path : r.path;
}

function getExt(item: FileDiff): string {
    return getPath(item).split(".").pop()?.toLowerCase() ?? "";
}

function sortItems(items: FileDiff[], mode: SortMode): FileDiff[] {
    return [...items].sort((a, b) => {
        if (mode === "ext") {
            const extDiff = getExt(a).localeCompare(getExt(b));
            if (extDiff !== 0) return extDiff;
        }
        if (mode === "state") {
            const stateDiff = (STATE_ORDER[a.result.state] ?? 99) - (STATE_ORDER[b.result.state] ?? 99);
            if (stateDiff !== 0) return stateDiff;
        }
        return getPath(a).localeCompare(getPath(b));
    });
}

export class FileTree {
    private el: HTMLElement;
    private items: FileDiff[] = [];
    private mode: SortMode = "alpha";

    constructor() {
        this.el = document.getElementById("file-tree")!;

        const sortBtns = document.querySelectorAll<HTMLButtonElement>(".sort-btn");
        for (const btn of sortBtns) {
            btn.addEventListener("click", () => {
                const next = btn.dataset.sort as SortMode;
                if (next === this.mode) return;
                this.mode = next;
                for (const b of sortBtns) b.classList.toggle("active", b === btn);
                this.render(this.items);
            });
        }
    }

    render(items: FileDiff[]): void {
        this.items = items;
        this.el.innerHTML = "";
        const sorted = sortItems(items, this.mode);
        const root = buildTree(sorted);
        for (const [name, node] of root.children) {
            this.el.appendChild(renderNode(name, node, 0));
        }
    }
}