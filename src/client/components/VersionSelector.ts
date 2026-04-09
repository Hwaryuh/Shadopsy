export class VersionSelector {
    private selectA: HTMLSelectElement;
    private selectB: HTMLSelectElement;
    private compareBtn: HTMLButtonElement;
    private versions: string[] = [];

    constructor(private onCompare: (a: string, b: string) => void) {
        this.selectA = document.getElementById("select-a") as HTMLSelectElement;
        this.selectB = document.getElementById("select-b") as HTMLSelectElement;
        this.compareBtn = document.getElementById("compare-btn") as HTMLButtonElement;

        this.selectA.addEventListener("change", () => this.onSelectAChange());
        this.selectB.addEventListener("change", () => this.onSelectBChange());

        this.compareBtn.addEventListener("click", () => {
            const a = this.selectA.value;
            const b = this.selectB.value;
            if (a && b) this.onCompare(a, b);
        });
    }

    populate(versions: string[]): void {
        this.versions = versions;

        const placeholderA = new Option("Old version", "", true, true);
        const placeholderB = new Option("New version", "", true, true);
        placeholderA.disabled = true;
        placeholderB.disabled = true;
        this.selectA.append(placeholderA);
        this.selectB.append(placeholderB);

        for (const v of versions) {
            this.selectA.append(new Option(v, v));
            this.selectB.append(new Option(v, v));
        }
    }

    private onSelectAChange(): void {
        const idxA = this.versions.indexOf(this.selectA.value);
        for (const opt of Array.from(this.selectB.options)) {
            if (!opt.value) continue;
            opt.disabled = this.versions.indexOf(opt.value) <= idxA;
        }
        this.updateCompareBtn();
    }

    private onSelectBChange(): void {
        const idxB = this.versions.indexOf(this.selectB.value);
        for (const opt of Array.from(this.selectA.options)) {
            if (!opt.value) continue;
            opt.disabled = this.versions.indexOf(opt.value) >= idxB;
        }
        this.updateCompareBtn();
    }

    private updateCompareBtn(): void {
        const a = this.selectA.value;
        const b = this.selectB.value;
        this.compareBtn.disabled = !a || !b;
    }
}