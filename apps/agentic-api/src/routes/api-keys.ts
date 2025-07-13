import { createRoute } from "@hono/zod-openapi";
import { db, tables, eq } from "@llmgateway/db";
import { nanoid } from "nanoid";
import { z } from "zod";

import { routes } from "./index";

// Generate a secure API key
function generateApiKey(): string {
	return `sk-${nanoid(48)}`;
}

// Hash the API key for storage
async function _hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Mask the API key for display
function maskApiKey(key: string): string {
	if (!key || key.length < 16) {
		return "sk-****";
	}
	// Show first 12 chars to match main API behavior
	const visibleChars = 12;
	const maskedLength = Math.max(key.length - visibleChars, 0);
	return `${key.substring(0, visibleChars)}${"\u2022".repeat(maskedLength)}`;
}

// Get API keys
routes.openapi(
	createRoute({
		method: "get",
		path: "/keys/api",
		request: {
			query: z.object({
				projectId: z.string().optional(),
			}),
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							apiKeys: z.array(
								z.object({
									id: z.string(),
									createdAt: z.string(),
									updatedAt: z.string(),
									description: z.string(),
									status: z.enum(["active", "inactive", "deleted"]).nullable(),
									projectId: z.string(),
									maskedToken: z.string(),
								}),
							),
						}),
					},
				},
				description: "Returns the user's API keys",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const { projectId } = c.req.query();

		// Get user's organizations
		const userOrganizations = await db.query.userOrganization.findMany({
			where: {
				userId: user.id,
			},
		});

		const organizationIds = userOrganizations.map((uo) => uo.organizationId);

		// Get projects for those organizations
		let projectIds: string[] = [];
		if (projectId) {
			// Verify user has access to this specific project
			const project = await db.query.project.findFirst({
				where: {
					id: projectId,
					organizationId: {
						in: organizationIds,
					},
				},
			});
			if (project) {
				projectIds = [projectId];
			}
		} else {
			// Get all projects for user's organizations
			const projects = await db.query.project.findMany({
				where: {
					organizationId: {
						in: organizationIds,
					},
				},
			});
			projectIds = projects.map((p) => p.id);
		}

		// Get API keys for these projects
		const apiKeys =
			projectIds.length > 0
				? await db.query.apiKey.findMany({
						where: {
							projectId: {
								in: projectIds,
							},
						},
						orderBy: {
							createdAt: "desc",
						},
					})
				: [];

		const formattedKeys = apiKeys.map((key) => ({
			id: key.id,
			createdAt: key.createdAt.toISOString(),
			updatedAt: key.updatedAt.toISOString(),
			description: key.description || "",
			status: key.status,
			projectId: key.projectId,
			maskedToken: maskApiKey(key.token),
		}));

		return c.json({ apiKeys: formattedKeys }, 200);
	},
);

// Create API key
routes.openapi(
	createRoute({
		method: "post",
		path: "/keys/api",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							description: z.string(),
							projectId: z.string(),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							apiKey: z.object({
								id: z.string(),
								token: z.string(),
								description: z.string(),
								projectId: z.string(),
								createdAt: z.string(),
							}),
						}),
					},
				},
				description: "Returns the created API key",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized",
			},
			403: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Forbidden - user doesn't have access to this project",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const { description, projectId } = await c.req.json();

		// Verify user has access to this project
		const userOrganizations = await db.query.userOrganization.findMany({
			where: {
				userId: user.id,
			},
		});

		const organizationIds = userOrganizations.map((uo) => uo.organizationId);

		const project = await db.query.project.findFirst({
			where: {
				id: projectId,
				organizationId: {
					in: organizationIds,
				},
			},
		});

		if (!project) {
			return c.json({ message: "Access denied to this project" }, 403);
		}

		// Generate API key
		const apiKey = generateApiKey();

		// Create the API key record
		// Note: Storing plain token to match gateway expectations
		// In production, this should be hashed and gateway should be updated
		const [newKey] = await db
			.insert(tables.apiKey)
			.values({
				description,
				projectId,
				token: apiKey, // Store plain token to match gateway
				status: "active",
			})
			.returning();

		return c.json(
			{
				apiKey: {
					id: newKey.id,
					token: apiKey,
					description: newKey.description || "",
					projectId: newKey.projectId,
					createdAt: newKey.createdAt.toISOString(),
				},
			},
			200,
		);
	},
);

// Update API key
routes.openapi(
	createRoute({
		method: "patch",
		path: "/keys/api/{id}",
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							status: z.enum(["active", "inactive"]).optional(),
							description: z.string().optional(),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							apiKey: z.object({
								id: z.string(),
								status: z.enum(["active", "inactive", "deleted"]).nullable(),
								description: z.string(),
								updatedAt: z.string(),
							}),
						}),
					},
				},
				description: "Returns the updated API key",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized",
			},
			403: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Forbidden - user doesn't have access to this API key",
			},
			404: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "API key not found",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const { id } = c.req.param();
		const updates = await c.req.json();

		// Get the API key
		const apiKey = await db.query.apiKey.findFirst({
			where: {
				id,
			},
			with: {
				project: {
					with: {
						organization: {
							with: {
								userOrganizations: {
									where: {
										userId: user.id,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!apiKey) {
			return c.json({ message: "API key not found" }, 404);
		}

		// Check if user has access
		if (!apiKey.project?.organization?.userOrganizations?.length) {
			return c.json({ message: "Access denied to this API key" }, 403);
		}

		// Update the API key
		const [updatedKey] = await db
			.update(tables.apiKey)
			.set({
				...(updates.status && { status: updates.status }),
				...(updates.description && { description: updates.description }),
			})
			.where(eq(tables.apiKey.id, id))
			.returning();

		return c.json(
			{
				apiKey: {
					id: updatedKey.id,
					status: updatedKey.status,
					description: updatedKey.description || "",
					updatedAt: updatedKey.updatedAt.toISOString(),
				},
			},
			200,
		);
	},
);

// Delete API key
routes.openapi(
	createRoute({
		method: "delete",
		path: "/keys/api/{id}",
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "API key deleted successfully",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized",
			},
			403: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Forbidden - user doesn't have access to this API key",
			},
			404: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "API key not found",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const { id } = c.req.param();

		// Get the API key
		const apiKey = await db.query.apiKey.findFirst({
			where: {
				id,
			},
			with: {
				project: {
					with: {
						organization: {
							with: {
								userOrganizations: {
									where: {
										userId: user.id,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!apiKey) {
			return c.json({ message: "API key not found" }, 404);
		}

		// Check if user has access
		if (!apiKey.project?.organization?.userOrganizations?.length) {
			return c.json({ message: "Access denied to this API key" }, 403);
		}

		// Soft delete the API key
		await db
			.update(tables.apiKey)
			.set({
				status: "deleted",
			})
			.where(eq(tables.apiKey.id, id));

		return c.json({ message: "API key deleted successfully" }, 200);
	},
);
