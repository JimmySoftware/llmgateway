import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { db } from "@llmgateway/db";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { authHandler } from "./auth/handler";
import { routes } from "./routes";
import "./routes/activity";
import "./routes/api-keys";
import "./routes/chat";
import "./routes/chats";
import "./routes/credits";
import "./routes/organizations";
import "./routes/payments";
import "./routes/projects";
import "./routes/subscriptions";
import "./routes/user";

import type { ServerTypes } from "./vars";

export const config = {
	servers: [
		{
			url: process.env.AGENTIC_API_URL || "http://localhost:4000",
		},
	],
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Agentic API",
	},
};

export const app = new OpenAPIHono<ServerTypes>();

// Parse ORIGIN_URL to support multiple origins separated by commas
const allowedOrigins = process.env.ORIGIN_URL
	? process.env.ORIGIN_URL.split(",")
			.map((url) => url.trim())
			.filter((url) => url && !url.startsWith("#"))
	: ["http://localhost:3000", "http://localhost:3002"];

console.log("CORS allowed origins:", allowedOrigins);

app.use(
	"*",
	cors({
		origin: allowedOrigins,
		allowHeaders: ["Content-Type", "Authorization", "Cache-Control"],
		allowMethods: ["POST", "GET", "OPTIONS", "PUT", "PATCH", "DELETE"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

app.onError((error, c) => {
	if (error instanceof HTTPException) {
		return c.json({ message: error.message }, error.status);
	}
	console.error("Unhandled error:", error);
	return c.json({ message: "Internal server error" }, 500);
});

const healthRoute = createRoute({
	method: "get",
	path: "/health",
	summary: "Check if the agentic API is healthy",
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						status: z.string(),
						timestamp: z.string(),
					}),
				},
			},
			description: "The API is healthy",
		},
	},
});

app.openapi(healthRoute, async (c) => {
	const dbResult = await db.execute("select 1");
	const isDbHealthy = Boolean(dbResult.rows.length);

	return c.json({
		status: isDbHealthy ? "healthy" : "unhealthy",
		timestamp: new Date().toISOString(),
	});
});

app.on(["POST", "GET", "PUT", "PATCH", "DELETE"], "/auth/*", (c) => {
	return authHandler(c.req.raw);
});

app.doc("/reference", config);

app.get("/ui/*", swaggerUI({ url: "/reference" }));

app.route("/", routes);

export default app;
