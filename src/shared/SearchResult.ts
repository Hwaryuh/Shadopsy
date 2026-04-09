import { DiffState } from "./DiffResult";

export type SearchScope = "path" | "content";

export interface ContentMatch {
    line: number;
    text: string;
}

export interface SearchMatch {
    path: string;
    state: DiffState;
    matches?: ContentMatch[];
}

export interface SearchResponse {
    results: SearchMatch[];
}
