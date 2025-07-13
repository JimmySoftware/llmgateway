import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

import { auth } from "../auth/auth";

import type { ServerTypes } from "../vars";

export const routes = new OpenAPIHono<ServerTypes>();

// Auth middleware
routes.use("*", async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		throw new HTTPException(401, {
			message: "Unauthorized",
		});
	}

	c.set("user", session.user);
	c.set("session", session.session);

	await next();
});

// TODO: Add agentic-specific routes here
// Example: Memory, Tools, RAG, Prompts routes
