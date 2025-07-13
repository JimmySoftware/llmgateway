import { z } from "zod";

import { routes } from "./index";

// Subscription status schema
const subscriptionStatusSchema = z.object({
	isActive: z.boolean(),
	plan: z.enum(["free", "pro"]),
	isTrialActive: z.boolean(),
	trialEndsAt: z.string().nullable(),
	status: z.enum(["active", "canceled", "past_due", "trialing"]).nullable(),
	cancelAtPeriodEnd: z.boolean(),
	currentPeriodEnd: z.string().nullable(),
	interval: z.enum(["month", "year"]).nullable(),
});

// GET /subscriptions/status
routes.openapi(
	{
		method: "get",
		path: "/subscriptions/status",
		description: "Get subscription status for the current user",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Subscription status",
				content: {
					"application/json": {
						schema: subscriptionStatusSchema,
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Return default free plan status for now
		// In production, this would query the actual subscription data
		return c.json({
			isActive: false,
			plan: "free" as const,
			isTrialActive: false,
			trialEndsAt: null,
			status: null,
			cancelAtPeriodEnd: false,
			currentPeriodEnd: null,
			interval: null,
		});
	},
);

// POST /subscriptions/cancel-pro-subscription
routes.openapi(
	{
		method: "post",
		path: "/subscriptions/cancel-pro-subscription",
		description: "Cancel Pro subscription",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Subscription canceled successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							message: z.string(),
						}),
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// TODO: Implement actual subscription cancellation
		return c.json({
			success: true,
			message: "Subscription canceled successfully",
		});
	},
);

// POST /subscriptions/resume-pro-subscription
routes.openapi(
	{
		method: "post",
		path: "/subscriptions/resume-pro-subscription",
		description: "Resume Pro subscription",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Subscription resumed successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							message: z.string(),
						}),
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// TODO: Implement actual subscription resumption
		return c.json({
			success: true,
			message: "Subscription resumed successfully",
		});
	},
);

// POST /subscriptions/upgrade-to-yearly
routes.openapi(
	{
		method: "post",
		path: "/subscriptions/upgrade-to-yearly",
		description: "Upgrade subscription to yearly plan",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Upgraded to yearly plan successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							message: z.string(),
						}),
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// TODO: Implement actual yearly upgrade
		return c.json({
			success: true,
			message: "Upgraded to yearly plan successfully",
		});
	},
);
