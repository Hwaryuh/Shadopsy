export type DiffState = "added" | "removed" | "renamed" | "edited";

export type DiffHunkType = "unchanged" | "added" | "removed";

export interface FileMeta {
    path: string;
    size: number;
    crc32: number;
}

export interface DiffLine {
    lineA: number | null;
    lineB: number | null;
    textA: string | null;
    textB: string | null;
    type: "added" | "removed" | "unchanged" | "empty";
}

export type DiffResult =
    | { state: "added"; path: string; b: FileMeta }
    | { state: "removed"; path: string; a: FileMeta }
    | { state: "edited"; path: string; a: FileMeta; b: FileMeta }
    | { state: "renamed"; a: FileMeta; b: FileMeta };