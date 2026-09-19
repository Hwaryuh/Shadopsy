# glslck

Compile-checks a resource pack's core shaders against Minecraft 26.3 without launching the game.

From 26.3 the client compiles shaders with **shaderc**, targeting Vulkan 1.2 and producing SPIR-V
(`com.mojang.renderpearl.frontend.shaders.GlslCompiler`). This tool drives the same shaderc build the
game ships, with the same compile options and the same `#include` resolver, so an error here is an
error the client would also hit.

## Requirements

- JDK (`java`, `javac`, `jar`) — 21+
- Node 20+
- A Minecraft **client** jar for the target version
- `cfr.jar` (any recent CFR release) next to this README, or passed with `--cfr`
- `.minecraft/libraries/org/lwjgl/{lwjgl,lwjgl-shaderc}` — populated by running the version once

## Setup (once per Minecraft version)

```bash
node setup.mjs /path/to/26.3.jar
```

This unpacks the vanilla shaders, decompiles `RenderPipelines`, derives the real shader define
combinations, and builds the compile harness. Everything lands in `versions/<version>/`.

Options: `--out DIR`, `--cfr PATH`, `--libraries DIR`.

## Checking a pack

```bash
node check-pack.mjs <packDir> versions/26.3/vanilla
```

Each overridden shader is compiled once per define combination the game actually uses. Add
`--only text` to narrow to matching filenames, or `--first-error` to stop each file at its first
failing variant (much faster while iterating).

Result lines:

- `PASS` — every variant compiled
- `FAIL` — at least one variant failed; the first failure is printed in full
- `ORPHAN` — no pipeline in this version references that shader, so the file is dead weight

Exit status is non-zero when anything failed.

## Checking one shader

```bash
java -cp "$(cat cp.txt)" ShaderCheck <shader.vsh> --root <packDir> --root <vanillaDir> DEFINE OTHER=1
```

Roots are searched in order for `assets/<namespace>/shaders/include/<path>`, matching how
`ShaderManager` resolves includes.

## Scope

**26.3 and later only.** 26.2 and earlier use the old text-substituting `#moj_import` preprocessor
(`com.mojang.blaze3d.preprocessor.GlslPreprocessor`) and compile GLSL directly through the driver, so
their rules are different and much more lenient. Results from this tool do not apply to them.

The check is a compile check. It proves a shader builds; it says nothing about whether it draws the
right thing.

## How variant extraction works

`extract-variants.mjs` reads the decompiled `RenderPipelines.java` and resolves:

- snippet inheritance (a pipeline inherits the defines of every snippet it is built from)
- OIT pipeline sets, which cross their base snippet with the depth-bounds, transmittance and
  accumulate passes — combinations that appear nowhere literally in the source
- define values that are Java constant references rather than literals (see `CONSTANTS`)

Snippets themselves are skipped: they are only ever mixed into pipelines, never compiled alone.

Sanity check: running the tool with the vanilla tree as both pack and vanilla should report zero
failures. On 26.3 it reports `61 pass, 0 fail, 2 orphan` — the orphans are `core/position.{vsh,fsh}`,
which vanilla ships but no longer references.
