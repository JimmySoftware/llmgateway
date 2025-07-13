import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import { routes } from "./index";

const chatCompletionSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(["user", "assistant", "system"]),
			content: z.string(),
		}),
	),
	model: z.string(),
	stream: z.boolean().optional().default(false),
	apiKey: z.string().optional(), // Optional user API key
});

// POST /chat/completion
routes.openapi(
	{
		method: "post",
		path: "/chat/completion",
		description: "Chat completion endpoint",
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
				description: "Unauthorized",
			},
			500: {
				description: "Internal server error",
			},
		},
		middleware: [],
	},
	async (c) => {
		try {
			const body = c.req.valid("json");
			const { messages, model, stream } = body;

			// For now, we'll bypass the gateway and directly call the provider APIs
			// This is a temporary solution for the playground
			let providerUrl: string;
			let authHeader: string;
			let requestBody: any;

			if (model.startsWith("gpt-") || model.startsWith("o1-")) {
				// OpenAI models
				if (!process.env.OPENAI_API_KEY) {
					throw new HTTPException(500, {
						message: "OpenAI API key not configured",
					});
				}
				providerUrl = "https://api.openai.com/v1/chat/completions";
				authHeader = `Bearer ${process.env.OPENAI_API_KEY}`;
				requestBody = {
					model,
					messages,
					stream,
					temperature: 0.7,
					max_tokens: 2048,
				};
			} else if (model.startsWith("claude-")) {
				// Anthropic models
				if (!process.env.ANTHROPIC_API_KEY) {
					throw new HTTPException(500, {
						message: "Anthropic API key not configured",
					});
				}
				providerUrl = "https://api.anthropic.com/v1/messages";
				authHeader = process.env.ANTHROPIC_API_KEY;
				// Convert to Anthropic format
				requestBody = {
					model,
					messages: messages.filter((m: any) => m.role !== "system"),
					system: messages.find((m: any) => m.role === "system")?.content,
					max_tokens: 2048,
					stream,
				};
			} else if (model.startsWith("gemini-")) {
				// Google models
				if (!process.env.GOOGLE_AI_STUDIO_API_KEY) {
					throw new HTTPException(500, {
						message: "Google API key not configured",
					});
				}
				// For simplicity, we'll use OpenAI format via gateway for now
				return c.json(
					{ error: "Google models not yet supported in playground" },
					400,
				);
			} else {
				return c.json({ error: `Unsupported model: ${model}` }, 400);
			}

			const response = await fetch(providerUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(model.startsWith("claude-")
						? {
								"x-api-key": authHeader,
								"anthropic-version": "2023-06-01",
							}
						: {
								Authorization: authHeader,
							}),
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorText = await response.text();
				try {
					const errorJson = JSON.parse(errorText);
					if (errorJson.message) {
						return c.json(
							{ error: "gateway returned: " + errorJson.message },
							response.status as any,
						);
					}
					return c.json(
						{ error: `Failed to get chat completion: ${errorText}` },
						response.status as any,
					);
				} catch (_err) {
					return c.json(
						{ error: `Failed to get chat completion: ${errorText}` },
						response.status as any,
					);
				}
			}

			if (stream) {
				// Handle streaming response
				if (model.startsWith("claude-")) {
					// Anthropic has a different streaming format
					return c.json(
						{ error: "Streaming not yet supported for Anthropic models" },
						400,
					);
				}

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

				if (model.startsWith("claude-")) {
					// Convert Anthropic response to OpenAI format
					return c.json({
						choices: [
							{
								message: {
									content: responseData.content?.[0]?.text || "",
									role: "assistant",
								},
								finish_reason: responseData.stop_reason || "stop",
							},
						],
						model: responseData.model,
					});
				} else {
					// OpenAI format, return as-is
					return c.json(responseData);
				}
			}
		} catch (error) {
			console.error("Chat completion error:", error);
			return c.json({ error: "Failed to get chat completion" }, 500);
		}
	},
);
