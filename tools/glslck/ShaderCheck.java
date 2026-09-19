import org.lwjgl.system.MemoryUtil;
import org.lwjgl.util.shaderc.Shaderc;
import org.lwjgl.util.shaderc.ShadercIncludeResolve;
import org.lwjgl.util.shaderc.ShadercIncludeResult;
import org.lwjgl.util.shaderc.ShadercIncludeResultRelease;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Compiles a Minecraft 26.3 core shader exactly the way the game does, so shader errors surface
 * without launching the client.
 *
 * Mirrors com.mojang.renderpearl.frontend.shaders.GlslCompiler: shaderc, Vulkan 1.2 target env,
 * auto-bound uniforms, no optimization, and an #include resolver backed by shaders/include/.
 *
 * Usage: ShaderCheck <shaderFile> [--root DIR]... [DEFINE|DEFINE=VALUE]...
 *   --root may be repeated; roots are searched in order for assets/<ns>/shaders/include/<path>.
 */
public final class ShaderCheck {
    private static final int TARGET_ENV_VULKAN = 0;
    private static final int VULKAN_1_2 = 0x402000;
    private static final int KIND_VERTEX = 0;
    private static final int KIND_FRAGMENT = 1;

    private final List<Path> roots;
    private final List<ShadercIncludeResult> allocated = new ArrayList<>();

    private ShaderCheck(List<Path> roots) {
        this.roots = roots;
    }

    public static void main(String[] args) throws IOException {
        if (args.length == 0) {
            System.err.println("usage: ShaderCheck <shaderFile> [--root DIR]... [DEFINE[=VALUE]]...");
            System.exit(2);
        }

        Path shader = null;
        List<Path> roots = new ArrayList<>();
        Map<String, String> defines = new LinkedHashMap<>();

        for (int i = 0; i < args.length; i++) {
            String arg = args[i];
            if (arg.equals("--root")) {
                roots.add(Path.of(args[++i]));
            } else if (shader == null) {
                shader = Path.of(arg);
            } else {
                int eq = arg.indexOf('=');
                if (eq < 0) defines.put(arg, "");
                else defines.put(arg.substring(0, eq), arg.substring(eq + 1));
            }
        }

        if (shader == null) throw new IllegalArgumentException("no shader file given");
        if (roots.isEmpty()) roots.add(shader.toAbsolutePath().getParent());

        String name = shader.getFileName().toString();
        int kind = name.endsWith(".fsh") ? KIND_FRAGMENT : KIND_VERTEX;
        String source = Files.readString(shader);

        ShaderCheck check = new ShaderCheck(roots);
        String error = check.compile(name, source, kind, defines);

        if (error == null) {
            System.out.println("OK   " + shader + describe(defines));
        } else {
            System.out.println("FAIL " + shader + describe(defines));
            System.out.println(error.strip().indent(2));
            System.exit(1);
        }
    }

    private static String describe(Map<String, String> defines) {
        if (defines.isEmpty()) return "  [no defines]";
        StringBuilder sb = new StringBuilder("  [");
        defines.forEach((k, v) -> sb.append(v.isEmpty() ? k : k + "=" + v).append(' '));
        return sb.append(']').toString().replace(" ]", "]");
    }

    /** @return null when the shader compiled, otherwise shaderc's error text. */
    private String compile(String name, String source, int kind, Map<String, String> defines) {
        long compiler = Shaderc.shaderc_compiler_initialize();
        long options = Shaderc.shaderc_compile_options_initialize();

        Shaderc.shaderc_compile_options_set_target_env(options, TARGET_ENV_VULKAN, VULKAN_1_2);
        Shaderc.shaderc_compile_options_set_auto_bind_uniforms(options, true);
        Shaderc.shaderc_compile_options_set_preserve_bindings(options, false);
        Shaderc.shaderc_compile_options_set_generate_debug_info(options);
        Shaderc.shaderc_compile_options_set_optimization_level(options, 0);
        defines.forEach((k, v) -> Shaderc.shaderc_compile_options_add_macro_definition(options, k, v));

        ShadercIncludeResolve resolver = ShadercIncludeResolve.create(
                (userData, requestedSource, type, requestingSource, depth) ->
                        resolveInclude(MemoryUtil.memUTF8(requestedSource)));
        ShadercIncludeResultRelease release = ShadercIncludeResultRelease.create((userData, result) -> {});
        Shaderc.shaderc_compile_options_set_include_callbacks(options, resolver, release, 0L);

        ByteBuffer sourceBuf = MemoryUtil.memUTF8(source, false);
        ByteBuffer nameBuf = MemoryUtil.memUTF8(name);
        ByteBuffer entryBuf = MemoryUtil.memUTF8("main");

        try {
            long result = Shaderc.shaderc_compile_into_spv(compiler, sourceBuf, kind, nameBuf, entryBuf, options);
            try {
                if (Shaderc.shaderc_result_get_compilation_status(result) != 0) {
                    return Shaderc.shaderc_result_get_error_message(result);
                }
                return null;
            } finally {
                Shaderc.shaderc_result_release(result);
            }
        } finally {
            MemoryUtil.memFree(entryBuf);
            MemoryUtil.memFree(nameBuf);
            MemoryUtil.memFree(sourceBuf);
            resolver.free();
            release.free();
            allocated.forEach(ShaderCheck::freeResult);
            allocated.clear();
            Shaderc.shaderc_compile_options_release(options);
            Shaderc.shaderc_compiler_release(compiler);
        }
    }

    /**
     * Mirrors GlslCompiler.processInclude: the requested string is a resource id, resolved against
     * shaders/include/. A bare path takes the default `minecraft` namespace.
     */
    private long resolveInclude(String requested) {
        String namespace = "minecraft";
        String path = requested;
        int colon = requested.indexOf(':');
        if (colon >= 0) {
            namespace = requested.substring(0, colon);
            path = requested.substring(colon + 1);
        }

        for (Path root : roots) {
            Path file = root.resolve("assets").resolve(namespace).resolve("shaders/include").resolve(path);
            if (Files.isRegularFile(file)) {
                try {
                    return result(requested, Files.readString(file));
                } catch (IOException e) {
                    return result("", "failed to read " + file + ": " + e.getMessage());
                }
            }
        }
        return result("", "not found");
    }

    private long result(String sourceName, String content) {
        ShadercIncludeResult r = ShadercIncludeResult.calloc();
        r.source_name(MemoryUtil.memUTF8(sourceName, false));
        r.content(MemoryUtil.memUTF8(content, false));
        allocated.add(r);
        return r.address();
    }

    private static void freeResult(ShadercIncludeResult r) {
        MemoryUtil.memFree(r.source_name());
        MemoryUtil.memFree(r.content());
        r.free();
    }
}
