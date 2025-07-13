import { createRoute } from "@hono/zod-openapi";
import { db, tables, eq, sql } from "@llmgateway/db";
import { z } from "zod";

import { routes } from "./index";

// Get credit balance for a specific organization
routes.openapi(
	createRoute({
		method: "get",
		path: "/orgs/{orgId}/credits",
		request: {
			params: z.object({
				orgId: z.string(),
			}),
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							organizationId: z.string(),
							credits: z.string(),
							plan: z.enum(["free", "pro"]),
							planExpiresAt: z.string().nullable(),
							autoTopUpEnabled: z.boolean(),
							autoTopUpThreshold: z.string().nullable(),
							autoTopUpAmount: z.string().nullable(),
						}),
					},
				},
				description: "Returns the organization's credit balance",
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
			404: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Organization not found",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const { orgId } = c.req.param();

		// Check if user has access to this organization
		const userOrg = await db.query.userOrganization.findFirst({
			where: {
				userId: user.id,
				organizationId: orgId,
			},
			with: {
				organization: true,
			},
		});

		if (!userOrg) {
			return c.json({ message: "Access denied to this organization" }, 403);
		}

		if (!userOrg.organization || userOrg.organization.status === "deleted") {
			return c.json({ message: "Organization not found" }, 404);
		}

		const org = userOrg.organization;

		return c.json(
			{
				organizationId: org.id,
				credits: org.credits,
				plan: org.plan,
				planExpiresAt: org.planExpiresAt?.toISOString() || null,
				autoTopUpEnabled: org.autoTopUpEnabled,
				autoTopUpThreshold: org.autoTopUpThreshold,
				autoTopUpAmount: org.autoTopUpAmount,
			},
			200,
		);
	},
);

// Get credit transactions for an organization
routes.openapi(
	createRoute({
		method: "get",
		path: "/orgs/{orgId}/credits/transactions",
		request: {
			params: z.object({
				orgId: z.string(),
			}),
			query: z.object({
				limit: z.string().optional().default("50"),
				offset: z.string().optional().default("0"),
			}),
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							transactions: z.array(
								z.object({
									id: z.string(),
									type: z.enum(["credit", "debit"]),
									amount: z.string(),
									balance: z.string(),
									description: z.string().nullable(),
									createdAt: z.string(),
								}),
							),
							total: z.number(),
						}),
					},
				},
				description: "Returns the organization's credit transactions",
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
		const { orgId } = c.req.param();
		const { limit, offset } = c.req.query();

		// Check if user has access to this organization
		const userOrg = await db.query.userOrganization.findFirst({
			where: {
				userId: user.id,
				organizationId: orgId,
			},
		});

		if (!userOrg) {
			return c.json({ message: "Access denied to this organization" }, 403);
		}

		// Get transactions
		const transactions = await db.query.transaction.findMany({
			where: {
				organizationId: orgId,
			},
			orderBy: {
				createdAt: "desc",
			},
			limit: Number.parseInt(limit, 10),
			offset: Number.parseInt(offset, 10),
		});

		// Get total count
		const [countResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(tables.transaction)
			.where(eq(tables.transaction.organizationId, orgId));

		const total = countResult?.count || 0;

		const formattedTransactions = transactions.map((tx) => ({
			id: tx.id,
			type: (tx.type === "credit_topup" ? "credit" : "debit") as
				| "credit"
				| "debit",
			amount: tx.creditAmount || tx.amount || "0",
			balance: "0", // Balance tracking would need to be implemented
			description: tx.description || null,
			createdAt: tx.createdAt.toISOString(),
		}));

		return c.json(
			{
				transactions: formattedTransactions,
				total,
			},
			200,
		);
	},
);
