import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import { routes } from "./index";
import { validateApiKey } from "../middleware/auth";

const chatCompletionSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(["user", "assistant", "system"]),
			content: z.string(),
		}),
	),
	model: z.string(),
	stream: z.boolean().optional().default(false),
	apiKey: z.string(), // Required for validation
	// Add other OpenAI-compatible parameters
	temperature: z.number().optional(),
	top_p: z.number().optional(),
	n: z.number().optional(),
	stop: z.union([z.string(), z.array(z.string())]).optional(),
	max_tokens: z.number().optional(),
	presence_penalty: z.number().optional(),
	frequency_penalty: z.number().optional(),
	logit_bias: z.record(z.number()).optional(),
	user: z.string().optional(),
});

// POST /chat/completion
routes.openapi(
	{
		method: "post",
		path: "/chat/completion",
		description:
			"Chat completion endpoint - validates API key and forwards to LLM Gateway",
		request: {
			body: {
				content: {
					"application/json": {
						schema: chatCompletionSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Chat completion response",
			},
			400: {
				description: "Bad request",
			},
			401: {
				description: "Unauthorized - Invalid API key",
			},
			403: {
				description: "Forbidden - Inactive project or organization",
			},
			500: {
				description: "Internal server error",
			},
		},
		middleware: [validateApiKey],
	},
	async (c) => {
		try {
			const body = c.req.valid("json");
			const { apiKey, ...chatParams } = body;

			// Get the validated context
			const validatedKey = c.get("apiKey");
			const project = c.get("project");
			const organization = c.get("organization");

			if (!validatedKey || !project || !organization) {
				throw new HTTPException(401, {
					message: "Invalid authentication context",
				});
			}

			// Log the usage (optional - for tracking)
			console.log(
				`API call from org: ${organization.name}, project: ${project.name}`,
			);

			// Forward the request to the gateway
			const gatewayUrl = "http://localhost:4001"; // Internal gateway URL

			const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(chatParams),
			});

			if (!response.ok) {
				const errorText = await response.text();
				try {
					const errorJson = JSON.parse(errorText);
					return c.json(errorJson, response.status as any);
				} catch {
					return c.json(
						{ error: `Gateway error: ${errorText}` },
						response.status as any,
					);
				}
			}

			// Handle streaming response
			if (chatParams.stream) {
				return streamSSE(c, async (stream) => {
					const reader = response.body?.getReader();
					if (!reader) {
						await stream.writeSSE({
							data: JSON.stringify({ error: "No response body" }),
							event: "error",
						});
						return;
					}

					const decoder = new TextDecoder();
					let buffer = "";

					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) {
								break;
							}

							buffer += decoder.decode(value, { stream: true });
							const lines = buffer.split("\n");
							buffer = lines.pop() || "";

							for (const line of lines) {
								if (line.startsWith("data: ")) {
									await stream.writeSSE({
										data: line.slice(6),
									});
								}
							}
						}
					} catch (error) {
						console.error("Streaming error:", error);
						await stream.writeSSE({
							data: JSON.stringify({ error: "Streaming failed" }),
							event: "error",
						});
					}
				});
			} else {
				// Handle non-streaming response
				const responseData = await response.json();
				return c.json(responseData);
			}
		} catch (error) {
			console.error("Chat completion error:", error);

			// If error is already an HTTPException, re-throw it
			if (error instanceof HTTPException) {
				throw error;
			}

			return c.json({ error: "Failed to get chat completion" }, 500);
		}
	},
);
