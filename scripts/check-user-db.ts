#!/usr/bin/env tsx
import { config } from "dotenv";
import fs from "fs";
import path from "path";

import { closeDatabase } from "../packages/db/src/db.js";
import { db } from "../packages/db/src/index.js";
import { user } from "../packages/db/src/index.js";
import { eq } from "../packages/db/src/index.js";

// Load .env file from parent directory to ensure correct DATABASE_URL is used
const envPath = path.resolve(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
	console.error("Error: .env file not found at", envPath);
	console.error("Please ensure .env file exists in the project root");
	process.exit(1);
}

const envResult = config({ path: envPath });
if (envResult.error) {
	console.error("Error loading .env file:", envResult.error.message);
	process.exit(1);
}

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
	console.error("Error: DATABASE_URL not found in .env file");
	console.error("Please add DATABASE_URL to your .env file");
	process.exit(1);
}

async function checkUser(email: string) {
	try {
		const userRecord = await db
			.select()
			.from(user)
			.where(eq(user.email, email.toLowerCase()));

		console.log("Database user record:");
		console.log(JSON.stringify(userRecord[0], null, 2));
	} catch (error) {
		console.error("Error:", error);
	} finally {
		await closeDatabase();
		process.exit(0);
	}
}

checkUser("jimmy@makerasia.com");
