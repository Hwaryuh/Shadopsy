/**
 * One-time setup per Minecraft version: unpacks the vanilla shaders, works out the real shader
 * define combinations, and builds the compile harness.
 *
 * Usage: node setup.mjs <clientJar> [--out DIR] [--cfr PATH] [--libraries DIR]
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const args = process.argv.slice(2);
const jar = args[0];

if (!jar || jar.startsWith("--")) {
    console.error("usage: node setup.mjs <clientJar> [--out DIR] [--cfr PATH] [--libraries DIR]");
    process.exit(2);
}

const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

const here = import.meta.dirname;
const version = path.basename(jar, ".jar");
const out = path.resolve(opt("--out", path.join(here, "versions", version)));
const cfr = opt("--cfr", path.join(here, "cfr.jar"));
const libraries = opt("--libraries", path.join(process.env.APPDATA ?? "", ".minecraft/libraries"));

const run = (cmd, cmdArgs, cwd = here) =>
    execFileSync(cmd, cmdArgs, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString();

fs.mkdirSync(out, { recursive: true });

// 1. Vanilla shader tree — the fallback root for #include and the reference for diffing.
// The JDK's jar tool is used rather than unzip: unzip's path patterns silently extract nothing
// against these jars on Windows.
console.log(`[1/4] extracting vanilla shaders from ${path.basename(jar)}`);
const vanilla = path.join(out, "vanilla");
fs.rmSync(vanilla, { recursive: true, force: true });
fs.mkdirSync(vanilla, { recursive: true });
run("jar", ["xf", path.resolve(jar), "assets/minecraft/shaders", "assets/minecraft/post_effect"], vanilla);
const count = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => path.extname(f)).length;
console.log(`      ${count(vanilla)} files -> ${path.relative(here, vanilla)}`);

// 2. RenderPipelines holds every pipeline's shader + defines; decompile just that class.
console.log("[2/4] decompiling RenderPipelines");
if (!fs.existsSync(cfr)) {
    console.error(`  cfr.jar not found at ${cfr} — pass --cfr <path>`);
    process.exit(1);
}
const classesDir = path.join(out, "classes-in");
fs.rmSync(classesDir, { recursive: true, force: true });
fs.mkdirSync(classesDir, { recursive: true });
run("jar", ["xf", path.resolve(jar), "net/minecraft/client/renderer/RenderPipelines.class"], classesDir);
run("java", ["-jar", cfr, path.join(classesDir, "net/minecraft/client/renderer/RenderPipelines.class"),
    "--outputdir", path.join(out, "src"), "--silent", "true"]);

// 3. Resolve snippet inheritance and OIT passes into a flat per-shader variant list.
console.log("[3/4] extracting shader define variants");
console.log("      " + run("node", [path.join(here, "extract-variants.mjs"),
    path.join(out, "src/net/minecraft/client/renderer/RenderPipelines.java"),
    path.join(out, "variants.json")]).trim());

// 4. The harness itself: shaderc via the same LWJGL build the game ships.
console.log("[4/4] building ShaderCheck");
const lwjglDir = path.join(libraries, "org/lwjgl");
const pickLatest = (module) => {
    const dir = path.join(lwjglDir, module);
    if (!fs.existsSync(dir)) throw new Error(`${dir} not found — pass --libraries <dir>`);
    const versions = fs.readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return path.join(dir, versions.at(-1));
};

const lwjgl = pickLatest("lwjgl");
const shaderc = pickLatest("lwjgl-shaderc");
const jars = [
    path.join(lwjgl, `lwjgl-${path.basename(lwjgl)}.jar`),
    path.join(lwjgl, `lwjgl-${path.basename(lwjgl)}-natives-windows.jar`),
    path.join(shaderc, `lwjgl-shaderc-${path.basename(shaderc)}.jar`),
    path.join(shaderc, `lwjgl-shaderc-${path.basename(shaderc)}-natives-windows.jar`),
];
const missing = jars.filter((j) => !fs.existsSync(j));
if (missing.length) {
    console.error("  missing LWJGL jars:\n" + missing.map((m) => "    " + m).join("\n"));
    process.exit(1);
}
console.log(`      lwjgl ${path.basename(lwjgl)}, shaderc ${path.basename(shaderc)}`);

const compileCp = jars.slice(0, 1).concat(jars.slice(2, 3)).join(path.delimiter);
run("javac", ["-cp", compileCp, "-d", path.join(here, "classes"), path.join(here, "ShaderCheck.java")]);
fs.writeFileSync(path.join(here, "cp.txt"), [path.join(here, "classes"), ...jars].join(path.delimiter));

console.log(`\nready. check a pack with:\n  node check-pack.mjs <packDir> "${vanilla}"`);
