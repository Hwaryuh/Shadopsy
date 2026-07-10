import { DiffResult } from "../../shared/DiffResult";
import { DomComponent } from "../types";
import { FileDiffHeader } from "./FileDiffHeader";
import { FileDiffContent } from "./FileDiffContent";

export class FileDiff implements DomComponent {
    readonly el: HTMLElement;
    private content: FileDiffContent;
    private loaded = false;

    constructor(
        readonly result: DiffResult,
        versionA: string,
        versionB: string
    ) {
        this.el = document.createElement("div");
        this.el.className = "diff-card bg-surface-container-lowest rounded-[10px] shadow-card overflow-hidden";
        this.el.dataset.state = result.state;
        this.el.dataset.open = "false";
        this.el.dataset.path = result.state === "renamed" ? result.b.path : result.path;

        this.content = new FileDiffContent(result, versionA, versionB);

        this.el.appendChild(FileDiffHeader.of(result));
        this.el.appendChild(this.content.el);

        if (result.state === "edited" || result.state === "renamed" || result.state === "added" || result.state === "removed") {
            this.el.querySelector(".diff-file-header")!.addEventListener("click", () => this.toggle());
        }
    }

    private async toggle(): Promise<void> {
        const isOpen = !this.content.el.classList.contains("hidden");
        this.content.el.classList.toggle("hidden");
        this.el.dataset.open = String(!isOpen);
        if (!isOpen && !this.loaded) {
            this.loaded = true;
            await this.content.load();
        }
    }
}