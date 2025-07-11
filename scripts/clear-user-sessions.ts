#!/usr/bin/env tsx
import { config } from "dotenv";
import fs from "fs";
import path from "path";

import { closeDatabase } from "../packages/db/src/db.js";
import { db } from "../packages/db/src/index.js";
import { session, user } from "../packages/db/src/index.js";
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

async function clearUserSessions(email: string) {
	try {
		// Find user by email
		const userRecord = await db
			.select()
			.from(user)
			.where(eq(user.email, email.toLowerCase()))
			.limit(1)
			.then((users) => users[0]);

		if (!userRecord) {
			console.log(`User with email ${email} not found`);
			process.exit(1);
		}

		// Delete all sessions for this user
		const result = await db
			.delete(session)
			.where(eq(session.userId, userRecord.id))
			.returning({ id: session.id });

		console.log(`✓ Cleared ${result.length} sessions for ${email}`);
		console.log(
			"Please log in again to see the updated email verification status",
		);
	} catch (error) {
		console.error("Error clearing sessions:", error);
		process.exit(1);
	} finally {
		await closeDatabase();
		process.exit(0);
	}
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
	console.log("Usage: tsx clear-user-sessions.ts <email>");
	process.exit(1);
}

clearUserSessions(email);
