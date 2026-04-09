export class ResizableSidebar {
    private sidebar: HTMLElement;
    private handle: HTMLElement;
    private mainContent: HTMLElement;
    private dragging = false;
    private minWidth = 160;
    private maxWidth = 480;

    constructor() {
        this.sidebar = document.getElementById("sidebar")!;
        this.handle = document.getElementById("sidebar-handle")!;
        this.mainContent = document.getElementById("main-content")!;

        this.handle.addEventListener("mousedown", (e) => this.onMouseDown(e));
        document.addEventListener("mousemove", (e) => this.onMouseMove(e));
        document.addEventListener("mouseup", () => this.onMouseUp());
    }

    private onMouseDown(e: MouseEvent): void {
        this.dragging = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.dragging) return;
        const width = Math.min(Math.max(e.clientX, this.minWidth), this.maxWidth);
        this.sidebar.style.width = `${width}px`;
        this.mainContent.style.marginLeft = `${width}px`;
    }

    private onMouseUp(): void {
        if (!this.dragging) return;
        this.dragging = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }
}