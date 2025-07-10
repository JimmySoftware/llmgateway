import { fixExtensionsPlugin } from "esbuild-fix-imports-plugin";
import { defineConfig } from "tsup";

export default defineConfig({
	splitting: true,
	clean: true,
	dts: true,
	format: ["esm"],
	bundle: true,
	minify: false,
	entry: ["src/**/!(*.spec).ts", "src/**/!(*.e2e).ts"],
	sourcemap: true,
	target: "esnext",
	external: ["@llmgateway/db", "@llmgateway/models"],
	noExternal: [/^(?!@llmgateway\/).*/],
	esbuildPlugins: [fixExtensionsPlugin()],
	banner: {
		js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
	},
});
