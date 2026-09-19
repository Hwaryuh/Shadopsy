/**
 * Extracts the real shader-define combinations from a decompiled RenderPipelines.java.
 *
 * Snippets inherit from other snippets, so defines are collected transitively; an OIT pipeline set
 * contributes both its base variant and its accumulate-modified variant.
 *
 * Output: { "core/entity": [ { "EMISSIVE": "", ... }, ... ] }
 */
import fs from "fs";

const src = fs.readFileSync(process.argv[2], "utf8");
const out = process.argv[3];

// Decompiled output keeps one statement per line; anything else is not a pipeline declaration.
const statements = src.split("\n").filter((l) => l.includes("RenderPipeline.builder") || l.includes("OitPipelineSet.builder"));

const nodes = new Map();

// Defines whose value is a Java constant reference rather than a literal; resolved from LevelRenderer.
const CONSTANTS = {
    "LevelRenderer.OIT_COEFFICIENT_COUNT": "8", // Math.powExact(2, 3)
    "LevelRenderer.OIT_TRANSMITTANCE_TARGET_COUNT": "2", // OIT_COEFFICIENT_COUNT / 4
};

function parseDefines(text) {
    const defines = {};
    const re = /withShaderDefine\(\s*\(?(?:String\s*\)?)?"([A-Z0-9_]+)"(?:\s*,\s*([^)]+))?\)/g;
    let m;
    while ((m = re.exec(text))) {
        let value = "";
        if (m[2] !== undefined) value = m[2].trim().replace(/[fF]$/, "").replace(/^\(\w+\)\s*/, "");
        defines[m[1]] = CONSTANTS[value] ?? value;
    }
    return defines;
}

function parseParents(text) {
    const block = text.match(/new RenderPipeline\.Snippet\[\]\{([^}]*)\}/);
    if (!block || !block[1].trim()) return [];
    return block[1].split(",").map((s) => s.trim()).filter(Boolean);
}

for (const line of statements) {
    const nameMatch = line.match(/(?:Snippet|RenderPipeline|OitPipelineSet)\s+([A-Z][A-Z0-9_]*)\s*=/);
    if (!nameMatch) continue;

    // An OIT set's accumulate modifier is a separate variant, so split it off before reading the base.
    const modifier = line.match(/withAccumulateModifier\((.*?)\)\.build\(\)/s);
    const base = modifier ? line.replace(modifier[0], "") : line;

    const shaders = new Set();
    for (const m of line.matchAll(/with(?:Vertex|Fragment)Shader\(\s*\(?(?:String\s*\)?)?"([^"]+)"\)/g)) shaders.add(m[1]);

    nodes.set(nameMatch[1], {
        parents: parseParents(base),
        defines: parseDefines(base),
        shaders: [...shaders],
        isOit: line.includes("OitPipelineSet.builder"),
        // Snippets are only ever mixed into real pipelines, never compiled on their own.
        isSnippet: line.includes("buildSnippet()"),
        modifierDefines: modifier ? parseDefines(modifier[1]) : null,
    });
}

function resolve(name, seen = new Set()) {
    const node = nodes.get(name);
    if (!node || seen.has(name)) return { defines: {}, shaders: [] };
    seen.add(name);

    let defines = {};
    let shaders = [];
    for (const parent of node.parents) {
        const r = resolve(parent, seen);
        defines = { ...defines, ...r.defines };
        shaders = [...shaders, ...r.shaders];
    }
    return { defines: { ...defines, ...node.defines }, shaders: [...shaders, ...node.shaders] };
}

const byShader = new Map();

function record(shaders, defines) {
    const key = JSON.stringify(Object.keys(defines).sort().map((k) => [k, defines[k]]));
    for (const shader of shaders) {
        if (!byShader.has(shader)) byShader.set(shader, new Map());
        byShader.get(shader).set(key, defines);
    }
}

// OitPipelineSet.build() crosses its base snippet with each OIT pass snippet, so those combinations
// never appear literally in RenderPipelines and have to be reconstructed here.
const OIT_PASSES = ["OIT_DEPTH_BOUNDS_SNIPPET", "OIT_TRANSMITTANCE_SNIPPET", "OIT_ACCUMULATE_SNIPPET"];

for (const [name, node] of nodes) {
    if (node.isSnippet) continue;
    const { defines, shaders } = resolve(name);
    if (!shaders.length) continue;
    record(shaders, defines);

    if (!node.isOit) {
        if (node.modifierDefines) record(shaders, { ...defines, ...node.modifierDefines });
        continue;
    }

    for (const pass of OIT_PASSES) {
        const passDefines = { ...defines, ...resolve(pass).defines };
        record(shaders, passDefines);
        // Only the accumulate pass runs the modifier.
        if (node.modifierDefines && pass === "OIT_ACCUMULATE_SNIPPET") {
            record(shaders, { ...passDefines, ...node.modifierDefines });
        }
    }
}

const result = {};
for (const [shader, variants] of byShader) result[shader] = [...variants.values()];

fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(`${Object.keys(result).length} shaders, ${Object.values(result).reduce((a, v) => a + v.length, 0)} variants -> ${out}`);
