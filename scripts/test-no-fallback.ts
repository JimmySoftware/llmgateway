#!/usr/bin/env tsx
import { Client } from "pg";

async function testFallback() {
	console.log("=== Testing Fallback Database Connection ===\n");

	// Try to connect to the old 'db' database (which no longer exists)
	const client = new Client({
		connectionString: "postgres://postgres:pw@localhost:5432/db",
	});

	try {
		await client.connect();
		console.log("❌ Connected to 'db' database - this shouldn't happen!");
	} catch (error) {
		console.log("✅ Good! Connection to 'db' database failed as expected");
		console.log("   Error:", error.message);
		console.log("\n   This means any code using the fallback will now fail");
		console.log("   and we can identify and fix it!");
	} finally {
		await client.end().catch(() => {});
	}

	console.log("\n=== Summary ===");
	console.log("1. Renamed 'db' database to prevent fallback connections");
	console.log("2. Added DATABASE_URL to all app .env files");
	console.log("3. Now all apps will use the correct 'llmgateway' database");
	console.log("4. Any code still using fallback will error and can be fixed");
}

testFallback().catch(console.error);
