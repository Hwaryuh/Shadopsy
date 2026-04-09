export interface ShaderEntry {
    path: string;
    size: number;
    crc32: number;
    content: string;
}

export interface VersionData {
    version: string;
    files: Record<string, ShaderEntry>;
}