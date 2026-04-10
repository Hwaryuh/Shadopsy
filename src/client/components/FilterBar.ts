export const STATES = ["added", "removed", "renamed", "edited"] as const;
export type DiffState = typeof STATES[number];
export type StateCounts = Record<DiffState, number>;

export class FilterBar {
    private activeStates = new Set<DiffState>(STATES);
    private onChange: (activeStates: Set<DiffState>) => void;
    private buttons = new Map<DiffState, HTMLButtonElement>();

    constructor(onChange: (activeStates: Set<DiffState>) => void) {
        this.onChange = onChange;

        const filtersEl = document.getElementById("filters")!;
        for (const btn of filtersEl.querySelectorAll<HTMLButtonElement>(".filter-btn")) {
            const state = btn.dataset.state as DiffState;
            btn.classList.add("active");
            btn.addEventListener("click", () => this.toggle(btn));
            this.buttons.set(state, btn);
        }
    }

    setCounts(counts: StateCounts): void {
        for (const [state, btn] of this.buttons) {
            const textNode = Array.from(btn.childNodes)
                .find(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "");
            if (textNode) {
                textNode.textContent = `${state.toUpperCase()}: ${counts[state]}`;
            }
        }
    }

    show(): void {
        document.getElementById("filters")!.style.display = "flex";
    }

    private toggle(btn: HTMLButtonElement): void {
        const state = btn.dataset.state as DiffState;
        if (this.activeStates.has(state)) {
            this.activeStates.delete(state);
            btn.classList.remove("active");
        } else {
            this.activeStates.add(state);
            btn.classList.add("active");
        }
        this.onChange(this.activeStates);
    }
}