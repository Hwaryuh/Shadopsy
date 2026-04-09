import "./style.css";
import { VersionSelector } from "./components/VersionSelector";
import { DiffViewer } from "./components/DiffViewer";
import { ResizableSidebar } from "./components/ResizableSidebar";
import { SearchBar } from "./components/SearchBar";
import { fetchVersions, fetchDiff, fetchSearch } from "./api";
import { DiffResult } from "../shared/DiffResult";

new ResizableSidebar();

const html = document.documentElement;
const themeToggle = document.getElementById("theme-toggle")!;

const savedTheme = localStorage.getItem("theme") ?? "dark";
html.classList.toggle("dark", savedTheme === "dark");
themeToggle.textContent = savedTheme === "dark" ? "light_mode" : "dark_mode";

themeToggle.addEventListener("click", () => {
    const isDark = html.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "light_mode" : "dark_mode";
});

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
    status.textContent = "Loading...";

    try {
        currentDiffs = await fetchDiff(a, b);
        viewer.render(currentDiffs, a, b);
        searchBar.setVersions(a, b);
    } catch (e) {
        console.error(e);
        status.textContent = "Failed to load diff.";
    }
});

fetchVersions()
    .then(versions => selector.populate(versions))
    .catch(() => {
        document.getElementById("status")!.textContent = "Failed to load versions.";
    });