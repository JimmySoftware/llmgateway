import { createRoute } from "@hono/zod-openapi";
import { db } from "@llmgateway/db";
import { z } from "zod";

import { routes } from "./index";

// Get user's organizations
routes.openapi(
	createRoute({
		method: "get",
		path: "/orgs",
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							organizations: z.array(
								z.object({
									id: z.string(),
									name: z.string(),
									credits: z.string(),
									plan: z.enum(["free", "pro"]),
									planExpiresAt: z.string().nullable(),
									autoTopUpEnabled: z.boolean(),
									autoTopUpThreshold: z.string().nullable(),
									autoTopUpAmount: z.string().nullable(),
									status: z.enum(["active", "inactive", "deleted"]).nullable(),
									createdAt: z.string(),
									updatedAt: z.string(),
								}),
							),
						}),
					},
				},
				description: "Returns the user's organizations",
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

		if (!user) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		// Get user's organizations
		const userOrganizations = await db.query.userOrganization.findMany({
			where: {
				userId: user.id,
			},
			with: {
				organization: true,
			},
		});

		const organizations = userOrganizations
			.filter(
				(userOrg) =>
					userOrg.organization !== null &&
					userOrg.organization.status !== "deleted",
			)
			.map((userOrg) => ({
				id: userOrg.organization!.id,
				name: userOrg.organization!.name,
				credits: userOrg.organization!.credits,
				plan: userOrg.organization!.plan,
				planExpiresAt:
					userOrg.organization!.planExpiresAt?.toISOString() || null,
				autoTopUpEnabled: userOrg.organization!.autoTopUpEnabled,
				autoTopUpThreshold: userOrg.organization!.autoTopUpThreshold,
				autoTopUpAmount: userOrg.organization!.autoTopUpAmount,
				status: userOrg.organization!.status,
				createdAt: userOrg.organization!.createdAt.toISOString(),
				updatedAt: userOrg.organization!.updatedAt.toISOString(),
			}));

		return c.json({ organizations }, 200);
	},
);

// Get organization's projects
routes.openapi(
	createRoute({
		method: "get",
		path: "/orgs/{id}/projects",
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
							projects: z.array(
								z.object({
									id: z.string(),
									name: z.string(),
									organizationId: z.string(),
									mode: z.enum(["credits", "api-keys", "hybrid"]),
									createdAt: z.string(),
									updatedAt: z.string(),
								}),
							),
						}),
					},
				},
				description: "Returns the organization's projects",
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
				description:
					"Forbidden - user doesn't have access to this organization",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const { id } = c.req.param();

		if (!user) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		// Check if user has access to this organization
		const userOrg = await db.query.userOrganization.findFirst({
			where: {
				userId: user.id,
				organizationId: id,
			},
		});

		if (!userOrg) {
			return c.json({ message: "Access denied to this organization" }, 403);
		}

		// Get projects for this organization
		const projects = await db.query.project.findMany({
			where: {
				organizationId: id,
			},
		});

		const formattedProjects = projects.map((project) => ({
			id: project.id,
			name: project.name,
			organizationId: project.organizationId,
			mode: project.mode,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
		}));

		return c.json({ projects: formattedProjects }, 200);
	},
);
