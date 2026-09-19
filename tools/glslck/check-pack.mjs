/**
 * Compiles every core shader a resource pack overrides, once per define combination the game
 * actually uses, and reports which combinations fail.
 *
 * Usage: node check-pack.mjs <packDir> <vanillaDir> [--only substring] [--first-error]
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const [packDir, vanillaDir, ...rest] = process.argv.slice(2);
if (!packDir || !vanillaDir) {
    console.error("usage: node check-pack.mjs <packDir> <vanillaDir> [--only substring] [--first-error]");
    process.exit(2);
}

const only = rest.includes("--only") ? rest[rest.indexOf("--only") + 1] : null;
const firstError = rest.includes("--first-error");

const classpath = fs.readFileSync(path.join(import.meta.dirname, "cp.txt"), "utf8").trim();

// setup.mjs lays out <versionDir>/{vanilla,variants.json}, so the variants sit beside the tree.
const variantsPath = path.join(path.dirname(path.resolve(vanillaDir)), "variants.json");
if (!fs.existsSync(variantsPath)) {
    console.error(`no variants.json next to ${vanillaDir} — run setup.mjs first`);
    process.exit(2);
}
const variants = JSON.parse(fs.readFileSync(variantsPath, "utf8"));

const coreDir = path.join(packDir, "assets/minecraft/shaders/core");
if (!fs.existsSync(coreDir)) {
    console.error(`no core shaders in ${coreDir}`);
    process.exit(2);
}

const shaders = fs
    .readdirSync(coreDir)
    .filter((f) => f.endsWith(".vsh") || f.endsWith(".fsh"))
    .filter((f) => !only || f.includes(only))
    .sort();

let failed = 0;
let passed = 0;
let orphaned = 0;

for (const file of shaders) {
    const key = "core/" + file.replace(/\.(vsh|fsh)$/, "");
    const combos = variants[key];

    // A pack file with no matching pipeline is dead weight: the game will never load it.
    if (!combos) {
        console.log(`ORPHAN ${file}  (no pipeline in this version uses ${key})`);
        orphaned++;
        continue;
    }

    const failures = [];
    for (const defines of combos) {
        const args = [
            "--enable-native-access=ALL-UNNAMED",
            "-cp", classpath,
            "ShaderCheck", path.join(coreDir, file),
            "--root", packDir,
            "--root", vanillaDir,
            ...Object.entries(defines).map(([k, v]) => (v === "" ? k : `${k}=${v}`)),
        ];

        try {
            execFileSync("java", args, { cwd: import.meta.dirname, stdio: "pipe" });
        } catch (e) {
            failures.push({ defines, output: (e.stdout || "").toString() });
            if (firstError) break;
        }
    }

    if (failures.length === 0) {
        console.log(`PASS   ${file}  (${combos.length} variants)`);
        passed++;
    } else {
        console.log(`FAIL   ${file}  (${failures.length}/${combos.length} variants)`);
        // Every variant tends to report the same underlying mistake, so show one in full.
        console.log(failures[0].output.split("\n").slice(1).join("\n").trimEnd());
        failed++;
    }
}

console.log(`\n${passed} pass, ${failed} fail, ${orphaned} orphan`);
process.exit(failed > 0 ? 1 : 0);
