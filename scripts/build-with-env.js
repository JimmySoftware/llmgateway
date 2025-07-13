#!/usr/bin/env node
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Run the build command with environment variables
try {
	console.log("Building with environment variables loaded...");
	execSync("TURBO_TOKEN=turbotokenoss turbo run build", {
		stdio: "inherit",
		env: process.env,
	});
} catch (error) {
	console.error("Build failed:", error.message);
	process.exit(1);
}
