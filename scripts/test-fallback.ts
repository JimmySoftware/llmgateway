#!/usr/bin/env tsx
import { config } from "dotenv";
import path from "path";

console.log("=== Testing Fallback Database Connections ===\n");

// Test 1: Direct import without loading .env
console.log("Test 1: Direct import without .env");
console.log("DATABASE_URL before import:", process.env.DATABASE_URL);

try {
	const { db } = await import("../packages/db/src/index.js");
	console.log("✓ Import successful - but this might fail on first query");

	// Try a simple query
	const { user } = await import("../packages/db/src/index.js");
	const result = await db.select().from(user).limit(1);
	console.log("✓ Query successful - found", result.length, "users");
} catch (error) {
	console.log("✗ Error:", error.message);
	if (error.message.includes('database "db" does not exist')) {
		console.log(
			"  → This confirms the code is using the fallback DATABASE_URL!",
		);
	}
}

// Test 2: With .env loaded
console.log("\n\nTest 2: With .env loaded");
config({ path: path.resolve(__dirname, "../.env") });

console.log("DATABASE_URL after loading .env:", process.env.DATABASE_URL);

// We need to clear the module cache to force a new connection
delete require.cache[require.resolve("../packages/db/src/db.js")];
delete require.cache[require.resolve("../packages/db/src/index.js")];

try {
	const { db: db2 } = await import("../packages/db/src/index.js");
	const { user: user2 } = await import("../packages/db/src/index.js");
	const result = await db2.select().from(user2).limit(1);
	console.log("✓ Query successful - found", result.length, "users");
	console.log(
		"  → This confirms .env is properly loaded and DATABASE_URL is respected",
	);
} catch (error) {
	console.log("✗ Error:", error.message);
}

process.exit(0);
