import "./style.css";
import { VersionSelector } from "./components/VersionSelector";
import { DiffViewer } from "./components/DiffViewer";
import { ResizableSidebar } from "./components/ResizableSidebar";
import { SearchBar } from "./components/SearchBar";
import { fetchVersions, fetchDiff, fetchSearch } from "./api";
import { DiffResult } from "../shared/DiffResult";

new ResizableSidebar();

const viewer = new DiffViewer();
let currentDiffs: DiffResult[] = [];

const searchBar = new SearchBar(async (query, scope) => {
    if (!query) {
        viewer.applySearch(null);
        return;
    }

    const versions = searchBar.getVersions();
    if (!versions) return;

    if (scope === "path") {
        viewer.applySearch(null, query);
        return;
    }

    try {
        const paths = await fetchSearch(versions.a, versions.b, query, scope, currentDiffs);
        viewer.applySearch(paths);
    } catch {
        viewer.applySearch(null);
    }
});

const selector = new VersionSelector(async (a, b) => {
    const status = document.getElementById("status")!;
    const compareBtn = document.getElementById("compare-btn") as HTMLButtonElement;
    status.textContent = "Loading...";
    compareBtn.disabled = true;
    compareBtn.classList.add("loading-pulse");

    try {
        currentDiffs = await fetchDiff(a, b);
        viewer.render(currentDiffs, a, b);
        searchBar.setVersions(a, b);
    } catch (e) {
        console.error(e);
        status.textContent = "Failed to load diff.";
    } finally {
        compareBtn.disabled = false;
        compareBtn.classList.remove("loading-pulse");
    }
});

fetchVersions()
    .then(versions => selector.populate(versions))
    .catch(() => {
        document.getElementById("status")!.textContent = "Failed to load versions.";
    });