import { SearchScope } from "shared/SearchResult";

export type SearchHandler = (query: string, scope: SearchScope) => void;

const DEBOUNCE_MS = 300;

export class SearchBar {
    private scope: SearchScope = "path";
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private versionA: string | null = null;
    private versionB: string | null = null;
    private input: HTMLInputElement;

    constructor(private onSearch: SearchHandler) {
        this.input = document.getElementById("search-input") as HTMLInputElement;
        const scopeBtns = document.querySelectorAll<HTMLButtonElement>(".search-scope-btn");

        this.input.addEventListener("input", () => {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                const q = this.input.value.trim();
                if (q && this.versionA && this.versionB) {
                    this.onSearch(q, this.scope);
                } else {
                    this.onSearch("", this.scope);
                }
            }, DEBOUNCE_MS);
        });

        for (const btn of scopeBtns) {
            btn.addEventListener("click", () => {
                this.scope = btn.dataset.scope as SearchScope;
                for (const b of scopeBtns) b.classList.toggle("active", b === btn);
                const q = this.input.value.trim();
                if (q && this.versionA && this.versionB) {
                    this.onSearch(q, this.scope);
                }
            });
        }
    }

    setVersions(a: string, b: string): void {
        this.versionA = a;
        this.versionB = b;
        this.input.disabled = false;
        this.input.placeholder = "Search...";
    }

    getVersions(): { a: string; b: string } | null {
        if (!this.versionA || !this.versionB) return null;
        return { a: this.versionA, b: this.versionB };
    }
}
