import { serve } from "@hono/node-server";

import app from "./index";

const port = Number(process.env.PORT) || 4000;

console.log(`listening on port \x1b[33m${port}\x1b[0m`);

serve({
	fetch: app.fetch,
	port,
});
