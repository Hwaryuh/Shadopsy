import fs from "fs";
import path from "path";
import zlib from "zlib";
import { VersionData } from "../src/shared/VersionData";

const JARS_DIR = path.resolve("jars");
const OUT_DIR  = path.resolve("public/data");

const TEXT_DECODER = new TextDecoder("utf-8");

const SHADER_PATH_PREFIXES = [
    "assets/minecraft/shaders/",
    "assets/minecraft/post_effect/",
];

const ALLOWED_EXTENSIONS = new Set([".fsh", ".vsh", ".glsl", ".json"]);

interface JarEntry {
    path: string;
    size: number;
    crc32: number;
    compressionMethod: number;
    compressedContent: Buffer;
}

function isTarget(filePath: string): boolean {
    const ext = path.extname(filePath);
    return SHADER_PATH_PREFIXES.some((p) => filePath.startsWith(p)) && ALLOWED_EXTENSIONS.has(ext);
}

function decompress(entry: JarEntry): string {
    if (entry.compressionMethod === 0) return TEXT_DECODER.decode(entry.compressedContent);
    return TEXT_DECODER.decode(zlib.inflateRawSync(entry.compressedContent));
}

function parseJar(jarPath: string): Map<string, JarEntry> {
    const buffer = fs.readFileSync(jarPath);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    let eocdOffset = -1;
    for (let i = array.length - 22; i >= 0; i--) {
        if (array[i] === 0x50 && array[i+1] === 0x4b && array[i+2] === 0x05 && array[i+3] === 0x06) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) throw new Error("EOCD signature not found");

    const centralDirOffset = view.getUint32(eocdOffset + 16, true);
    const fileCount = view.getUint16(eocdOffset + 10, true);
    const entries = new Map<string, JarEntry>();

    let offset = centralDirOffset;
    for (let i = 0; i < fileCount; i++) {
        const fileNameLength   = view.getUint16(offset + 28, true);
        const extraFieldLength = view.getUint16(offset + 30, true);
        const commentLength    = view.getUint16(offset + 32, true);

        const filePath = TEXT_DECODER.decode(array.subarray(offset + 46, offset + 46 + fileNameLength));

        if (!filePath.endsWith("/") && isTarget(filePath)) {
            const crc32             = view.getUint32(offset + 16, true);
            const compressedSize    = view.getUint32(offset + 20, true);
            const size              = view.getUint32(offset + 24, true);
            const localHeaderOffset = view.getUint32(offset + 42, true);
            const localFileNameLen  = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLen     = view.getUint16(localHeaderOffset + 28, true);
            const compressionMethod = view.getUint16(localHeaderOffset + 8, true);
            const dataStart         = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

            entries.set(filePath, {
                path: filePath,
                size,
                crc32,
                compressionMethod,
                compressedContent: Buffer.from(array.subarray(dataStart, dataStart + compressedSize)),
            });
        }

        offset += 46 + fileNameLength + extraFieldLength + commentLength;
    }

    return entries;
}

if (!fs.existsSync(JARS_DIR)) {
    console.error(`jars/ directory not found: ${JARS_DIR}`);
    process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const jars = fs.readdirSync(JARS_DIR).filter((f) => f.endsWith(".jar"));

if (jars.length === 0) {
    console.warn("No JAR files found in jars/");
    process.exit(0);
}

const versions: string[] = [];

for (const jar of jars) {
    const version = jar.replace(/\.jar$/, "");
    const jarPath = path.join(JARS_DIR, jar);

    process.stdout.write(`Processing ${jar}... `);

    const entries = parseJar(jarPath);
    const data: VersionData = { version, files: {} };

    for (const [filePath, entry] of entries) {
        data.files[filePath] = {
            path: filePath,
            size: entry.size,
            crc32: entry.crc32,
            content: decompress(entry),
        };
    }

    const outPath = path.join(OUT_DIR, `${version}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data));

    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`done (${kb} KB)`);

    versions.push(version);
}

versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
fs.writeFileSync(path.join(OUT_DIR, "versions.json"), JSON.stringify({ versions }));

console.log(`\nGenerated ${versions.length} versions -> ${OUT_DIR}`);