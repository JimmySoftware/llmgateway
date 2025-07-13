import { createRoute } from "@hono/zod-openapi";
import { db } from "@llmgateway/db";
import { z } from "zod";

import { routes } from "./index";

// Get user's projects
routes.openapi(
	createRoute({
		method: "get",
		path: "/projects",
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.array(
							z.object({
								id: z.string(),
								name: z.string(),
								organizationId: z.string(),
								mode: z.enum(["credits", "api-keys", "hybrid"]),
								createdAt: z.string(),
								updatedAt: z.string(),
							}),
						),
					},
				},
				description: "Returns the user's accessible projects",
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

		// Get user's organizations
		const userOrganizations = await db.query.userOrganization.findMany({
			where: {
				userId: user.id,
			},
		});

		const organizationIds = userOrganizations.map((uo) => uo.organizationId);

		// Get projects for those organizations
		const projects =
			organizationIds.length > 0
				? await db.query.project.findMany({
						where: {
							organizationId: {
								in: organizationIds,
							},
						},
					})
				: [];

		const formattedProjects = projects.map((project) => ({
			id: project.id,
			name: project.name,
			organizationId: project.organizationId,
			mode: project.mode,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
		}));

		return c.json(formattedProjects, 200);
	},
);
