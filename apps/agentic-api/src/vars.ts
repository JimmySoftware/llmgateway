import type { tables } from "@llmgateway/db";
import type { User, Session } from "better-auth/types";

export interface ServerTypes {
	Variables: {
		user: User;
		session: Session;
		apiKey?: typeof tables.apiKey.$inferSelect & {
			project: typeof tables.project.$inferSelect & {
				organization: typeof tables.organization.$inferSelect;
			};
		};
		project?: typeof tables.project.$inferSelect & {
			organization: typeof tables.organization.$inferSelect;
		};
		organization?: typeof tables.organization.$inferSelect;
	};
}
