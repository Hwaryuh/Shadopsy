import { DiffState } from "../../shared/DiffResult";

export const STATE_COLORS: Record<DiffState, string> = {
    edited:  "border-state-edited text-state-edited bg-state-edited-container/10",
    added:   "border-state-added text-state-added bg-state-added-container/10",
    removed: "border-state-removed text-state-removed bg-state-removed-container/10",
    renamed: "border-state-renamed text-state-renamed bg-state-renamed-container/10",
};

export const STATE_TEXT_COLORS: Record<DiffState, string> = {
    edited:  "text-state-edited",
    added:   "text-state-added",
    removed: "text-state-removed",
    renamed: "text-state-renamed",
};