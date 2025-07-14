import { db, tables, eq, and } from "@llmgateway/db";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export const validateApiKey = createMiddleware(async (c, next) => {
	// Clone the request to read body without consuming it
	const clonedReq = c.req.raw.clone();
	const body = await clonedReq.json();
	const apiKey = body.apiKey;

	if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
		throw new HTTPException(401, {
			message: "API key is required",
		});
	}

	// Validate the API key exists in the database
	const keys = await db
		.select()
		.from(tables.apiKey)
		.where(
			and(
				eq(tables.apiKey.token, apiKey.trim()),
				eq(tables.apiKey.status, "active"),
			),
		)
		.limit(1);

	if (keys.length === 0) {
		throw new HTTPException(401, {
			message: "Invalid or inactive API key",
		});
	}

	const key = keys[0];

	// Get the project
	const projects = await db
		.select()
		.from(tables.project)
		.where(eq(tables.project.id, key.projectId))
		.limit(1);

	if (projects.length === 0) {
		throw new HTTPException(403, {
			message: "Project not found",
		});
	}

	const project = projects[0];

	// Check if the project is active
	if (project.status !== "active") {
		throw new HTTPException(403, {
			message: "Project is inactive",
		});
	}

	// Get the organization
	const organizations = await db
		.select()
		.from(tables.organization)
		.where(eq(tables.organization.id, project.organizationId))
		.limit(1);

	if (organizations.length === 0) {
		throw new HTTPException(403, {
			message: "Organization not found",
		});
	}

	const organization = organizations[0];

	// Check if the organization is active
	if (organization.status !== "active") {
		throw new HTTPException(403, {
			message: "Organization is inactive",
		});
	}

	// Store the validated API key info in context
	c.set("apiKey", { ...key, project: { ...project, organization } });
	c.set("project", { ...project, organization });
	c.set("organization", organization);

	await next();
});
