import type { User, Session } from "better-auth/types";

export interface ServerTypes {
	Variables: {
		user: User;
		session: Session;
	};
}
