#!/usr/bin/env tsx
import { Client } from "pg";

async function checkDbDatabase() {
	const client = new Client({
		connectionString: "postgres://postgres:pw@localhost:5432/db",
	});

	try {
		await client.connect();
		console.log("Connected to 'db' database\n");

		// Check users
		const users = await client.query('SELECT COUNT(*) as count FROM "user"');
		console.log(`Users: ${users.rows[0].count}`);

		// List all users
		const userList = await client.query(
			'SELECT id, email, created_at FROM "user" ORDER BY created_at DESC',
		);
		console.log("\nUser list:");
		userList.rows.forEach((user) => {
			console.log(
				`- ${user.email} (ID: ${user.id}, Created: ${user.created_at})`,
			);
		});

		// Check organizations
		const orgs = await client.query(
			"SELECT COUNT(*) as count FROM organization",
		);
		console.log(`\nOrganizations: ${orgs.rows[0].count}`);

		// Check projects
		const projects = await client.query(
			"SELECT COUNT(*) as count FROM project",
		);
		console.log(`Projects: ${projects.rows[0].count}`);

		// Check API keys
		const keys = await client.query("SELECT COUNT(*) as count FROM key");
		console.log(`API Keys: ${keys.rows[0].count}`);

		// Check sessions
		const sessions = await client.query(
			"SELECT COUNT(*) as count FROM session",
		);
		console.log(`Sessions: ${sessions.rows[0].count}`);
	} catch (error) {
		console.error("Error:", error.message);
	} finally {
		await client.end();
	}
}

checkDbDatabase();
