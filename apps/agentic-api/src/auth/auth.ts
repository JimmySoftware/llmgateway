import { db, tables } from "@llmgateway/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "better-auth/plugins/passkey";
import nodemailer from "nodemailer";

const agenticApiUrl = process.env.AGENTIC_API_URL || "http://localhost:4000";
const agenticUiUrl = process.env.AGENTIC_UI_URL || "http://localhost:3000";
const originUrls =
	process.env.ORIGIN_URL || "http://localhost:3000,http://localhost:4000";
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFromEmail =
	process.env.SMTP_FROM_EMAIL || "contact@email.agenticgateway.ai";
const replyToEmail =
	process.env.SMTP_REPLY_TO_EMAIL || "contact@agenticgateway.ai";

export const auth = betterAuth({
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
			domain: ".agenticgateway.ai", // Use parent domain for cross-subdomain cookies
		},
		defaultCookieAttributes: {
			domain: ".agenticgateway.ai", // Use parent domain for cross-subdomain cookies
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
		expiresIn: 60 * 60 * 24 * 30, // 30 days
		updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
	},
	basePath: "/auth",
	trustedOrigins: originUrls.split(","),
	plugins: [
		passkey({
			rpID: process.env.PASSKEY_RP_ID || "agenticgateway.ai",
			rpName: process.env.PASSKEY_RP_NAME || "AgenticGateway",
			origin: agenticUiUrl,
		}),
	],
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: tables.user,
			session: tables.session,
			account: tables.account,
			verification: tables.verification,
			passkey: tables.passkey,
		},
	}),
	user: {
		// Include additional fields from the database in the user object
		additionalFields: {
			onboardingCompleted: {
				type: "boolean",
				defaultValue: false,
			},
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	emailVerification: {
		sendOnSignUp: !!smtpHost && !!smtpUser && !!smtpPass,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, token }) => {
			const url = `${agenticApiUrl}/auth/verify-email?token=${token}&callbackURL=${agenticUiUrl}/dashboard?emailVerified=true`;
			if (!smtpHost || !smtpUser || !smtpPass) {
				console.log(`email verification link: ${url}`);
				console.error(
					"SMTP configuration is not set. Email verification will not work.",
				);
				return;
			}

			const transporter = nodemailer.createTransport({
				host: smtpHost,
				port: smtpPort,
				secure: smtpPort === 465,
				auth: {
					user: smtpUser,
					pass: smtpPass,
				},
			});

			try {
				await transporter.sendMail({
					from: smtpFromEmail,
					replyTo: replyToEmail,
					to: user.email,
					subject: "Verify your email address",
					html: `
						<h1>Welcome to AgenticGateway!</h1>
						<p>Please click the link below to verify your email address:</p>
						<a href="${url}">Verify Email</a>
						<p>If you didn't create an account, you can safely ignore this email.</p>
						<p>Have feedback? Let us know by replying to this email!</p>
					`,
				});
			} catch (error) {
				console.error("Failed to send verification email:", error);
				throw new Error("Failed to send verification email. Please try again.");
			}
		},
	},
	secret: process.env.AUTH_SECRET || "your-secret-key",
	baseURL: agenticApiUrl || "http://localhost:4000",
});

export interface Variables {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
}
