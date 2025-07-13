import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/serve.ts"],
	outDir: "dist",
	format: ["esm"],
	sourcemap: true,
	clean: true,
	minify: false,
	splitting: false,
});
