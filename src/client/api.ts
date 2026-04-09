import { diffLines } from "diff";
import { DiffLine, DiffResult, FileMeta } from "../shared/DiffResult";
import { VersionData, ShaderEntry } from "../shared/VersionData";

const cache = new Map<string, VersionData>();

async function loadVersion(version: string): Promise<VersionData> {
    const hit = cache.get(version);
    if (hit) return hit;

    const res = await fetch(`data/${version}.json`);
    if (!res.ok) throw new Error(`Failed to load version: ${version}`);
    const data: VersionData = await res.json();
    cache.set(version, data);
    return data;
}

export async function fetchVersions(): Promise<string[]> {
    const res = await fetch("data/versions.json");
    if (!res.ok) throw new Error("Failed to load versions.json");
    const data: { versions: string[] } = await res.json();
    return data.versions;
}

function toMeta(entry: ShaderEntry): FileMeta {
    return { path: entry.path, size: entry.size, crc32: entry.crc32 };
}

export async function fetchDiff(versionA: string, versionB: string): Promise<DiffResult[]> {
    const [a, b] = await Promise.all([loadVersion(versionA), loadVersion(versionB)]);
    return computeDiff(a, b);
}

function computeDiff(a: VersionData, b: VersionData): DiffResult[] {
    const results: DiffResult[] = [];
    const aOnly = new Map<string, ShaderEntry>();
    const bOnly = new Map<string, ShaderEntry>();

    for (const [filePath, entry] of Object.entries(a.files)) {
        if (!(filePath in b.files)) {
            aOnly.set(filePath, entry);
        } else if (entry.crc32 !== b.files[filePath].crc32) {
            results.push({ state: "edited", path: filePath, a: toMeta(entry), b: toMeta(b.files[filePath]) });
        }
    }

    for (const [filePath, entry] of Object.entries(b.files)) {
        if (!(filePath in a.files)) {
            bOnly.set(filePath, entry);
        }
    }

    const aOnlyCrc = new Map<number, ShaderEntry[]>();
    for (const entry of aOnly.values()) {
        const list = aOnlyCrc.get(entry.crc32) ?? [];
        list.push(entry);
        aOnlyCrc.set(entry.crc32, list);
    }

    const matched = new Set<string>();

    for (const bEntry of bOnly.values()) {
        const candidates = aOnlyCrc.get(bEntry.crc32);
        if (!candidates) continue;

        const bExt = bEntry.path.split(".").pop();
        const sameExt = candidates.filter((e) => e.path.split(".").pop() === bExt);

        if (sameExt.length === 1) {
            const aEntry = sameExt[0];
            results.push({ state: "renamed", a: toMeta(aEntry), b: toMeta(bEntry) });
            matched.add(aEntry.path);
            matched.add(bEntry.path);
        }
    }

    for (const entry of aOnly.values()) {
        if (!matched.has(entry.path)) {
            results.push({ state: "removed", path: entry.path, a: toMeta(entry) });
        }
    }

    for (const entry of bOnly.values()) {
        if (!matched.has(entry.path)) {
            results.push({ state: "added", path: entry.path, b: toMeta(entry) });
        }
    }

    return results;
}

export async function fetchContentDiff(
    versionA: string, versionB: string,
    pathA: string, pathB: string,
): Promise<DiffLine[]> {
    const [a, b] = await Promise.all([loadVersion(versionA), loadVersion(versionB)]);
    return computeContentDiff(a.files[pathA].content, b.files[pathB].content);
}

export async function fetchSingleContent(
    version: string,
    filePath: string,
    side: "a" | "b",
): Promise<DiffLine[]> {
    const data = await loadVersion(version);
    const content = data.files[filePath]?.content ?? "";
    return content.replace(/\n$/, "").split("\n").map((text, i) =>
        side === "a"
            ? { lineA: i + 1, lineB: null, textA: text, textB: null, type: "removed" as const }
            : { lineA: null, lineB: i + 1, textA: null, textB: text, type: "added" as const }
    );
}

export async function fetchSearch(
    versionA: string, versionB: string,
    query: string, scope: "path" | "content",
    diffs: DiffResult[],
): Promise<Set<string>> {
    if (scope === "path") {
        const lower = query.toLowerCase();
        return new Set(
            diffs
                .filter((d) => {
                    const p = d.state === "renamed" ? d.b.path : d.path;
                    return p.toLowerCase().includes(lower);
                })
                .map((d) => (d.state === "renamed" ? d.b.path : d.path))
        );
    }

    const [a, b] = await Promise.all([loadVersion(versionA), loadVersion(versionB)]);
    const lower = query.toLowerCase();
    const matched = new Set<string>();

    for (const diff of diffs) {
        const paths: { path: string; data: VersionData }[] =
            diff.state === "renamed"
                ? [{ path: diff.a.path, data: a }, { path: diff.b.path, data: b }]
                : diff.state === "removed"
                ? [{ path: diff.path, data: a }]
                : [{ path: diff.path, data: b }];

        const hit = paths.some(({ path: p, data }) =>
            data.files[p]?.content.toLowerCase().includes(lower)
        );

        if (hit) {
            matched.add(diff.state === "renamed" ? diff.b.path : diff.path);
        }
    }

    return matched;
}

function computeContentDiff(aText: string, bText: string): DiffLine[] {
    const changes = diffLines(aText, bText);
    const aLines: { text: string; type: "removed" | "unchanged" }[] = [];
    const bLines: { text: string; type: "added" | "unchanged" }[] = [];

    for (const change of changes) {
        const lines = change.value.replace(/\n$/, "").split("\n");
        if (change.removed) {
            for (const line of lines) aLines.push({ text: line, type: "removed" });
        } else if (change.added) {
            for (const line of lines) bLines.push({ text: line, type: "added" });
        } else {
            for (const line of lines) {
                aLines.push({ text: line, type: "unchanged" });
                bLines.push({ text: line, type: "unchanged" });
            }
        }
    }

    const result: DiffLine[] = [];
    let ai = 0, bi = 0;
    let lineA = 1, lineB = 1;

    while (ai < aLines.length || bi < bLines.length) {
        const a = aLines[ai];
        const b = bLines[bi];

        if (a?.type === "unchanged" && b?.type === "unchanged") {
            result.push({ lineA: lineA++, lineB: lineB++, textA: a.text, textB: b.text, type: "unchanged" });
            ai++; bi++;
        } else if (a?.type === "removed" && b?.type === "added") {
            result.push({ lineA: lineA++, lineB: lineB++, textA: a.text, textB: b.text, type: "removed" });
            ai++; bi++;
        } else if (a?.type === "removed") {
            result.push({ lineA: lineA++, lineB: null, textA: a.text, textB: null, type: "removed" });
            ai++;
        } else if (b?.type === "added") {
            result.push({ lineA: null, lineB: lineB++, textA: null, textB: b.text, type: "added" });
            bi++;
        }
    }

    return result;
}