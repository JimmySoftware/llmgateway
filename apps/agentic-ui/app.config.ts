import contentCollections from "@content-collections/vinxi";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import { config } from "dotenv";
import svgr from "vite-plugin-svgr";
import tsConfigPaths from "vite-tsconfig-paths";

// Load environment variables from .env file
config();

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
	tsr: {
		appDirectory: "./src",
	},
	vite: {
		plugins: [
			contentCollections(),
			tsConfigPaths({
				projects: ["./tsconfig.json"],
			}),
			tailwindcss(),
			svgr(),
		],
	},
});
