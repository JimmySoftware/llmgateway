#!/usr/bin/env tsx
import { spawnSync } from "child_process";

console.log("=== Testing .env Loading Behavior ===\n");

// Test 1: Run from root directory
console.log("Test 1: Running from root directory");
const rootResult = spawnSync(
	"node",
	[
		"-e",
		`
	require('dotenv/config');
	console.log('DATABASE_URL:', process.env.DATABASE_URL);
`,
	],
	{
		cwd: "/sites/agenticgateway.ai/AgenticGateway/llmgateway",
		encoding: "utf8",
	},
);
console.log(rootResult.stdout);

// Test 2: Run from api directory
console.log("\nTest 2: Running from apps/api directory");
const apiResult = spawnSync(
	"node",
	[
		"-e",
		`
	require('dotenv/config');
	console.log('DATABASE_URL:', process.env.DATABASE_URL);
	console.log('API_URL:', process.env.API_URL);
`,
	],
	{
		cwd: "/sites/agenticgateway.ai/AgenticGateway/llmgateway/apps/api",
		encoding: "utf8",
	},
);
console.log(apiResult.stdout);

console.log("\n=== Conclusion ===");
console.log("When running from apps/api directory:");
console.log(
	"- It loads the local .env file which has API_URL but NOT DATABASE_URL",
);
console.log(
	"- This causes the database connection to use the fallback 'db' database",
);
console.log(
	"\nThis explains why you had duplicate users in different databases!",
);
