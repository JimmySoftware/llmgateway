#!/usr/bin/env tsx
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { Client } from "pg";

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

async function updateEmailVerification() {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	try {
		await client.connect();
		console.log("Connected to llmgateway database");

		// First check if user exists
		const checkResult = await client.query(
			'SELECT id, email, email_verified FROM "user" WHERE id = $1',
			["NWKLOXSxTKnEkPsnNHBjpe9hVNcBKU4b"],
		);

		if (checkResult.rows.length === 0) {
			console.log("User not found!");
			return;
		}

		console.log("Current user status:", checkResult.rows[0]);

		// Update email verification
		const updateResult = await client.query(
			'UPDATE "user" SET email_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *',
			["NWKLOXSxTKnEkPsnNHBjpe9hVNcBKU4b"],
		);

		console.log("\nUser updated successfully!");
		console.log("New status:", {
			id: updateResult.rows[0].id,
			email: updateResult.rows[0].email,
			email_verified: updateResult.rows[0].email_verified,
		});

		// Clear sessions to force re-login
		const sessionResult = await client.query(
			"DELETE FROM session WHERE user_id = $1",
			["NWKLOXSxTKnEkPsnNHBjpe9hVNcBKU4b"],
		);

		console.log(`\nCleared ${sessionResult.rowCount} sessions`);
		console.log("Please log in again to see the changes!");
	} catch (error) {
		console.error("Error:", error);
	} finally {
		await client.end();
	}
}

updateEmailVerification();
