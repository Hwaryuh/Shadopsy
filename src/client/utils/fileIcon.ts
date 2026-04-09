const EXT_ICON: Record<string, string> = {
    json: "data_object",
    vsh:  "deployed_code",
    fsh:  "format_paint",
    glsl: "code",
};

export function resolveFileIcon(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    return EXT_ICON[ext] ?? "description";
}
