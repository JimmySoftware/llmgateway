import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { routes } from "./index";

// Define the response schema for model-specific usage
const modelUsageSchema = z.object({
	model: z.string(),
	provider: z.string(),
	requestCount: z.number(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	totalTokens: z.number(),
	cost: z.number(),
});

// Define the response schema for daily activity
const dailyActivitySchema = z.object({
	date: z.string(),
	requestCount: z.number(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	totalTokens: z.number(),
	cost: z.number(),
	inputCost: z.number(),
	outputCost: z.number(),
	requestCost: z.number(),
	errorCount: z.number(),
	errorRate: z.number(),
	cacheCount: z.number(),
	cacheRate: z.number(),
	modelBreakdown: z.array(modelUsageSchema),
});

// Get activity endpoint
routes.openapi(
	createRoute({
		method: "get",
		path: "/activity",
		request: {
			query: z.object({
				days: z
					.string()
					.transform((val) => parseInt(val, 10))
					.pipe(z.number().int().positive()),
				projectId: z.string().optional(),
			}),
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							activity: z.array(dailyActivitySchema),
						}),
					},
				},
				description: "Activity data grouped by day",
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

		const { days } = c.req.valid("query");

		// TODO: Implement actual activity data retrieval
		// For now, return empty activity data to allow dashboard to load
		const activity = [];

		// Generate empty data for each day
		for (let i = 0; i < days; i++) {
			const date = new Date();
			date.setDate(date.getDate() - i);

			activity.push({
				date: date.toISOString().split("T")[0],
				requestCount: 0,
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0,
				cost: 0,
				inputCost: 0,
				outputCost: 0,
				requestCost: 0,
				errorCount: 0,
				errorRate: 0,
				cacheCount: 0,
				cacheRate: 0,
				modelBreakdown: [],
			});
		}

		return c.json(
			{
				activity: activity.reverse(), // Oldest first
			},
			200,
		);
	},
);
