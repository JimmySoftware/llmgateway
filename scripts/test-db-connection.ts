#!/usr/bin/env tsx
import { config } from "dotenv";
import path from "path";

import { closeDatabase } from "../packages/db/src/db.js";
import { db } from "../packages/db/src/index.js";
import { user } from "../packages/db/src/index.js";

// Load .env file from parent directory
config({ path: path.resolve(__dirname, "../.env") });

console.log("DATABASE_URL from environment:", process.env.DATABASE_URL);
console.log("Current working directory:", process.cwd());

async function testConnection() {
	try {
		const users = await db.select().from(user).limit(1);
		console.log("Successfully connected to database");
		console.log("Found", users.length, "users");
		if (users.length > 0) {
			console.log("First user ID:", users[0].id);
		}
	} catch (error) {
		console.error("Database connection error:", error);
	} finally {
		await closeDatabase();
		process.exit(0);
	}
}

testConnection();
