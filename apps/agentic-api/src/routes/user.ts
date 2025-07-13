import { createRoute } from "@hono/zod-openapi";
import { db, tables, eq } from "@llmgateway/db";
import { z } from "zod";

import { routes } from "./index";

// Schema for complete onboarding request
const completeOnboardingSchema = z.object({});

// Schema for public user data
const publicUserSchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	onboardingCompleted: z.boolean(),
});

// Complete onboarding endpoint
routes.openapi(
	createRoute({
		method: "post",
		path: "/user/me/complete-onboarding",
		request: {
			body: {
				content: {
					"application/json": {
						schema: completeOnboardingSchema,
					},
				},
			},
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							user: publicUserSchema,
							message: z.string(),
						}),
					},
				},
				description: "Onboarding completed successfully.",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized.",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		console.log(`[ONBOARDING] Updating onboarding status for user ${user.id}`);

		// Update the user's onboarding status
		await db
			.update(tables.user)
			.set({
				onboardingCompleted: true,
				updatedAt: new Date(),
			})
			.where(eq(tables.user.id, user.id));

		// Get the updated user
		const updatedUser = await db.query.user.findFirst({
			where: {
				id: user.id,
			},
		});

		if (!updatedUser) {
			console.error(`[ONBOARDING] User ${user.id} not found after update`);
			return c.json({ message: "User not found" }, 401);
		}

		console.log(`[ONBOARDING] User ${user.id} onboarding status updated:`, {
			id: updatedUser.id,
			email: updatedUser.email,
			onboardingCompleted: updatedUser.onboardingCompleted,
			updatedAt: updatedUser.updatedAt,
		});

		return c.json(
			{
				user: {
					id: updatedUser.id,
					name: updatedUser.name,
					email: updatedUser.email,
					emailVerified: updatedUser.emailVerified,
					image: updatedUser.image,
					createdAt: updatedUser.createdAt.toISOString(),
					updatedAt: updatedUser.updatedAt.toISOString(),
					onboardingCompleted: updatedUser.onboardingCompleted,
				},
				message: "Onboarding completed successfully",
			},
			200,
		);
	},
);

// Get current user endpoint
routes.openapi(
	createRoute({
		method: "get",
		path: "/user/me",
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							user: publicUserSchema,
						}),
					},
				},
				description: "Returns the current user.",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized.",
			},
		},
	}),
	async (c) => {
		const authUser = c.get("user");

		if (!authUser) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		// Get the full user record from database
		const user = await db.query.user.findFirst({
			where: {
				id: authUser.id,
			},
		});

		if (!user) {
			console.error(`[USER_ME] User ${authUser.id} not found in database`);
			return c.json({ message: "User not found" }, 401);
		}

		console.log(`[USER_ME] Fetched user ${user.id}:`, {
			id: user.id,
			email: user.email,
			onboardingCompleted: user.onboardingCompleted,
			updatedAt: user.updatedAt,
		});

		return c.json(
			{
				user: {
					id: user.id,
					name: user.name || null,
					email: user.email,
					emailVerified: user.emailVerified,
					image: user.image || null,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
					onboardingCompleted: user.onboardingCompleted,
				},
			},
			200,
		);
	},
);
