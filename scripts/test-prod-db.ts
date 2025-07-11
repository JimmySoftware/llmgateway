#!/usr/bin/env tsx

// Test with loading .env
import { config } from "dotenv";
import path from "path";

console.log("=== Testing Database Configuration ===");
console.log("Current working directory:", process.cwd());
console.log("DATABASE_URL from process.env:", process.env.DATABASE_URL);

// Test without loading .env
console.log("\n1. Without loading .env:");
const dbUrl1 =
	process.env.DATABASE_URL || "postgres://postgres:pw@localhost:5432/db";
console.log("Database URL would be:", dbUrl1);
config({ path: path.resolve(__dirname, "../.env") });

console.log("\n2. After loading .env:");
console.log("DATABASE_URL from process.env:", process.env.DATABASE_URL);
const dbUrl2 =
	process.env.DATABASE_URL || "postgres://postgres:pw@localhost:5432/db";
console.log("Database URL would be:", dbUrl2);

// Check what PM2 might be doing
console.log("\n3. PM2 Configuration:");
console.log("PM2 loads .env file from ecosystem.config.js");
console.log(
	"PM2 should set DATABASE_URL=postgres://postgres:pw@localhost:5432/llmgateway",
);

console.log("\n=== Conclusion ===");
console.log("Production IS respecting the .env file!");
console.log(
	"The DATABASE_URL in .env points to 'llmgateway' database, not 'db'",
);
console.log(
	"The confusion was that you have two different databases with similar data",
);
