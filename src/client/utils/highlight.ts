import hljs from "highlight.js/lib/core";
import glsl from "highlight.js/lib/languages/glsl";
import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("glsl", glsl);
hljs.registerLanguage("json", json);

const EXT_LANG: Record<string, string> = {
    fsh:  "glsl",
    vsh:  "glsl",
    glsl: "glsl",
    json: "json",
};

export function resolveLang(path: string): string | null {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return EXT_LANG[ext] ?? null;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function highlight(text: string, lang: string | null): string {
    if (!lang) return escapeHtml(text);
    try {
        return hljs.highlight(text, { language: lang }).value;
    } catch {
        return escapeHtml(text);
    }
}