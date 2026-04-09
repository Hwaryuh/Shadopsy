import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [tailwindcss()],
    root: "src/client",
    base: "./",
    publicDir: "../../public",
    server: {
        port: 5173,
    },
    build: {
        outDir: "../../dist",
    },
    resolve: {
        alias: {
            shared: "/src/shared",
        },
    },
});