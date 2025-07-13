import { db, tables, eq } from "@llmgateway/db";
import { z } from "zod";

import { routes } from "./index";

// Chat schemas
const chatSchema = z.object({
	id: z.string(),
	title: z.string(),
	model: z.string(),
	status: z.enum(["active", "archived", "deleted"]),
	createdAt: z.string(),
	updatedAt: z.string(),
	messageCount: z.number(),
});

const chatMessageSchema = z.object({
	id: z.string(),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	sequence: z.number(),
	createdAt: z.string(),
});

const createChatSchema = z.object({
	title: z.string().optional(),
	model: z.string(),
});

const updateChatSchema = z.object({
	title: z.string().optional(),
	status: z.enum(["active", "archived", "deleted"]).optional(),
});

const addMessageSchema = z.object({
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
});

// GET /chats
routes.openapi(
	{
		method: "get",
		path: "/chats",
		description: "Get all chats for the current user",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "List of chats",
				content: {
					"application/json": {
						schema: z.object({
							chats: z.array(chatSchema),
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

		// Get user's chats (excluding deleted)
		const allUserChats = await db.query.chat.findMany({
			where: {
				userId: user.id,
			},
		});

		// Filter out deleted chats
		const userChats = allUserChats
			.filter((chat) => chat.status !== "deleted")
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		// Get message count for each chat
		const chatsWithCounts = await Promise.all(
			userChats.map(async (chat) => {
				const messages = await db.query.message.findMany({
					where: {
						chatId: chat.id,
					},
				});

				return {
					id: chat.id,
					title: chat.title,
					model: chat.model,
					status: chat.status || "active",
					createdAt: chat.createdAt.toISOString(),
					updatedAt: chat.updatedAt.toISOString(),
					messageCount: messages.length,
				};
			}),
		);

		return c.json({
			chats: chatsWithCounts,
		});
	},
);

// GET /chats/{id}
routes.openapi(
	{
		method: "get",
		path: "/chats/{id}",
		description: "Get a specific chat",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			200: {
				description: "Chat details with messages",
				content: {
					"application/json": {
						schema: z.object({
							chat: chatSchema,
							messages: z.array(chatMessageSchema),
						}),
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
			404: {
				description: "Chat not found",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");
		const { id } = c.req.valid("param");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Get the chat
		const chat = await db.query.chat.findFirst({
			where: {
				id,
				userId: user.id,
			},
		});

		if (!chat) {
			return c.json({ error: "Chat not found" }, 404);
		}

		// Get messages for this chat
		const messages = await db.query.message.findMany({
			where: {
				chatId: id,
			},
		});

		// Sort by sequence
		const sortedMessages = messages.sort((a, b) => a.sequence - b.sequence);

		return c.json({
			chat: {
				id: chat.id,
				title: chat.title,
				model: chat.model,
				status: chat.status || "active",
				createdAt: chat.createdAt.toISOString(),
				updatedAt: chat.updatedAt.toISOString(),
				messageCount: messages.length,
			},
			messages: sortedMessages.map((msg) => ({
				id: msg.id,
				role: msg.role,
				content: msg.content,
				sequence: msg.sequence,
				createdAt: msg.createdAt.toISOString(),
			})),
		});
	},
);

// POST /chats
routes.openapi(
	{
		method: "post",
		path: "/chats",
		description: "Create a new chat",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: createChatSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Chat created successfully",
				content: {
					"application/json": {
						schema: z.object({
							chat: chatSchema,
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
		const body = c.req.valid("json");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Create the chat in database
		const [newChat] = await db
			.insert(tables.chat)
			.values({
				title: body.title || "New Chat",
				model: body.model,
				userId: user.id,
				status: "active",
			})
			.returning();

		return c.json({
			chat: {
				id: newChat.id,
				title: newChat.title,
				model: newChat.model,
				status: newChat.status || "active",
				createdAt: newChat.createdAt.toISOString(),
				updatedAt: newChat.updatedAt.toISOString(),
				messageCount: 0,
			},
		});
	},
);

// PATCH /chats/{id}
routes.openapi(
	{
		method: "patch",
		path: "/chats/{id}",
		description: "Update a chat",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: updateChatSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Chat updated successfully",
				content: {
					"application/json": {
						schema: chatSchema,
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
			404: {
				description: "Chat not found",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");
		const { id: _id } = c.req.valid("param");
		const _body = c.req.valid("json");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// TODO: Implement actual chat update
		return c.json({ error: "Chat not found" }, 404);
	},
);

// DELETE /chats/{id}
routes.openapi(
	{
		method: "delete",
		path: "/chats/{id}",
		description: "Delete a chat",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			200: {
				description: "Chat deleted successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
						}),
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
			404: {
				description: "Chat not found",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");
		const { id: _id } = c.req.valid("param");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// TODO: Implement actual chat deletion
		return c.json({ success: true });
	},
);

// POST /chats/{id}/messages
routes.openapi(
	{
		method: "post",
		path: "/chats/{id}/messages",
		description: "Add a message to a chat",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: addMessageSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Message added successfully",
				content: {
					"application/json": {
						schema: chatMessageSchema,
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
			404: {
				description: "Chat not found",
			},
		},
		middleware: [],
	},
	async (c) => {
		const user = c.get("user");
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");

		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Verify user owns this chat
		const chat = await db.query.chat.findFirst({
			where: {
				id,
				userId: user.id,
			},
		});

		if (!chat) {
			return c.json({ error: "Chat not found" }, 404);
		}

		// Get the current message count to determine sequence
		const existingMessages = await db.query.message.findMany({
			where: {
				chatId: id,
			},
		});

		// Add the message
		const [newMessage] = await db
			.insert(tables.message)
			.values({
				chatId: id,
				role: body.role,
				content: body.content,
				sequence: existingMessages.length + 1,
			})
			.returning();

		// Update chat's updatedAt timestamp
		await db
			.update(tables.chat)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(tables.chat.id, id));

		return c.json({
			id: newMessage.id,
			role: newMessage.role,
			content: newMessage.content,
			sequence: newMessage.sequence,
			createdAt: newMessage.createdAt.toISOString(),
		});
	},
);
