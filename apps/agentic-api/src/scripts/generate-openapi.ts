import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import app, { config } from "../index";

const schema = app.getOpenAPIDocument(config);

writeFileSync(
	resolve(import.meta.dirname, "../../openapi.json"),
	JSON.stringify(schema, null, 2),
);

console.log("OpenAPI schema generated successfully!");
process.exit(0);
