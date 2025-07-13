import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { routes } from "./index";

// Get payment methods endpoint
routes.openapi(
	createRoute({
		method: "get",
		path: "/payments/payment-methods",
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							paymentMethods: z.array(
								z.object({
									id: z.string(),
									type: z.string(),
									isDefault: z.boolean(),
									createdAt: z.string(),
									updatedAt: z.string(),
									cardBrand: z.string().optional(),
									cardLast4: z.string().optional(),
									expiryMonth: z.number().optional(),
									expiryYear: z.number().optional(),
								}),
							),
						}),
					},
				},
				description: "Returns the payment methods",
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

		// TODO: Implement actual payment methods retrieval
		// For now, return empty array to allow onboarding to complete
		return c.json(
			{
				paymentMethods: [],
			},
			200,
		);
	},
);

// Create payment intent endpoint (for credits purchase)
routes.openapi(
	createRoute({
		method: "post",
		path: "/payments/create-payment-intent",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							amount: z.number(),
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
							clientSecret: z.string(),
						}),
					},
				},
				description: "Payment intent created successfully",
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

		// TODO: Implement actual Stripe payment intent creation
		// For now, return a placeholder to allow onboarding flow testing
		return c.json(
			{
				clientSecret: "pi_placeholder_secret",
			},
			200,
		);
	},
);
