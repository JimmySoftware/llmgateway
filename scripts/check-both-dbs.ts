#!/usr/bin/env tsx
import { Client } from "pg";

async function checkDatabase(dbName: string, dbUrl: string) {
	const client = new Client({ connectionString: dbUrl });
	try {
		await client.connect();
		console.log(`\n=== Checking database: ${dbName} ===`);

		const result = await client.query(
			"SELECT id, email, name, email_verified FROM \"user\" WHERE email = 'jimmy@makerasia.com'",
		);

		if (result.rows.length > 0) {
			console.log("Found users:");
			result.rows.forEach((row) => {
				console.log(`- ID: ${row.id}`);
				console.log(`  Email: ${row.email}`);
				console.log(`  Name: ${row.name}`);
				console.log(`  Email Verified: ${row.email_verified}`);
			});
		} else {
			console.log("No users found with email jimmy@makerasia.com");
		}
	} catch (error) {
		console.error(`Error connecting to ${dbName}:`, error.message);
	} finally {
		await client.end();
	}
}

async function main() {
	// Check the 'db' database
	await checkDatabase("db", "postgres://postgres:pw@localhost:5432/db");

	// Check the 'llmgateway' database
	await checkDatabase(
		"llmgateway",
		"postgres://postgres:pw@localhost:5432/llmgateway",
	);
}

main().catch(console.error);
