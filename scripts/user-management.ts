#!/usr/bin/env tsx
import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import Table from "cli-table3";
import { program } from "commander";

import { closeDatabase } from "../packages/db/src/db.js";
import { desc, eq, ilike, or } from "../packages/db/src/index.js";
import { db } from "../packages/db/src/index.js";
import {
	account,
	organization,
	session,
	user,
	userOrganization,
} from "../packages/db/src/index.js";

const formatDate = (date: Date | null) => {
	if (!date) {
		return "N/A";
	}
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "short",
		timeStyle: "medium",
	}).format(date);
};

const getUserCredits = async (userId: string) => {
	const userOrgs = await db
		.select({
			organizationId: userOrganization.organizationId,
			organizationName: organization.name,
			credits: organization.credits,
		})
		.from(userOrganization)
		.innerJoin(
			organization,
			eq(userOrganization.organizationId, organization.id),
		)
		.where(eq(userOrganization.userId, userId));

	return userOrgs;
};

// Helper function to find user by ID or email
const findUserByIdOrEmail = async (idOrEmail: string) => {
	// Check if it's an email
	if (idOrEmail.includes("@")) {
		return await db
			.select()
			.from(user)
			.where(eq(user.email, idOrEmail.toLowerCase()))
			.limit(1)
			.then((users) => users[0]);
	}

	// Otherwise treat as ID
	return await db
		.select()
		.from(user)
		.where(eq(user.id, idOrEmail))
		.limit(1)
		.then((users) => users[0]);
};

program
	.name("user-management")
	.description("CLI tool for managing users in the LLMGateway database")
	.version("1.0.0");

program
	.command("list")
	.description("List all users")
	.option("-l, --limit <number>", "Limit number of results", "50")
	.option("-s, --search <query>", "Search users by email or name")
	.option("-v, --verified", "Show only verified users")
	.option("-u, --unverified", "Show only unverified users")
	.action(async (options) => {
		try {
			let query = db.select().from(user).orderBy(desc(user.createdAt));

			if (options.search) {
				query = query.where(
					or(
						ilike(user.email, `%${options.search}%`),
						ilike(user.name, `%${options.search}%`),
					),
				);
			}

			if (options.verified) {
				query = query.where(eq(user.emailVerified, true));
			} else if (options.unverified) {
				query = query.where(eq(user.emailVerified, false));
			}

			const users = await query.limit(parseInt(options.limit));

			if (users.length === 0) {
				console.log(chalk.yellow("No users found"));
				return;
			}

			const table = new Table({
				head: [
					chalk.cyan("ID"),
					chalk.cyan("Email"),
					chalk.cyan("Name"),
					chalk.cyan("Verified"),
					chalk.cyan("Onboarded"),
					chalk.cyan("Created"),
				],
				style: { head: [], border: [] },
			});

			users.forEach((u) => {
				table.push([
					u.id,
					u.email,
					u.name || chalk.gray("N/A"),
					u.emailVerified ? chalk.green("✓") : chalk.red("✗"),
					u.onboardingCompleted ? chalk.green("✓") : chalk.red("✗"),
					formatDate(u.createdAt),
				]);
			});

			console.log(table.toString());
			console.log(chalk.gray(`\nTotal: ${users.length} users`));
		} catch (error) {
			console.error(chalk.red("Error listing users:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("info <userIdOrEmail>")
	.description("View detailed user information (accepts user ID or email)")
	.action(async (userIdOrEmail) => {
		try {
			const userInfo = await findUserByIdOrEmail(userIdOrEmail);

			if (!userInfo) {
				console.log(chalk.red(`User ${userIdOrEmail} not found`));
				return;
			}

			console.log(chalk.bold("\n=== User Information ==="));
			console.log(chalk.gray("ID:"), userInfo.id);
			console.log(chalk.gray("Email:"), userInfo.email);
			console.log(chalk.gray("Name:"), userInfo.name || chalk.gray("Not set"));
			console.log(
				chalk.gray("Email Verified:"),
				userInfo.emailVerified ? chalk.green("Yes") : chalk.red("No"),
			);
			console.log(
				chalk.gray("Onboarding Completed:"),
				userInfo.onboardingCompleted ? chalk.green("Yes") : chalk.red("No"),
			);
			console.log(chalk.gray("Created:"), formatDate(userInfo.createdAt));
			console.log(chalk.gray("Updated:"), formatDate(userInfo.updatedAt));

			// Get organizations and credits
			const orgs = await getUserCredits(userInfo.id);
			if (orgs.length > 0) {
				console.log(chalk.bold("\n=== Organizations & Credits ==="));
				orgs.forEach((org) => {
					console.log(
						chalk.gray(`${org.organizationName}:`),
						chalk.yellow(`$${Number(org.credits).toFixed(2)}`),
					);
				});
			}

			// Get active sessions
			const sessions = await db
				.select()
				.from(session)
				.where(eq(session.userId, userInfo.id))
				.orderBy(desc(session.createdAt))
				.limit(5);

			if (sessions.length > 0) {
				console.log(chalk.bold("\n=== Recent Sessions ==="));
				sessions.forEach((s) => {
					console.log(
						chalk.gray("Session:"),
						s.id,
						chalk.gray("| Created:"),
						formatDate(s.createdAt),
						chalk.gray("| Expires:"),
						formatDate(s.expiresAt),
					);
				});
			}

			// Get accounts
			const accounts = await db
				.select()
				.from(account)
				.where(eq(account.userId, userInfo.id));

			if (accounts.length > 0) {
				console.log(chalk.bold("\n=== Linked Accounts ==="));
				accounts.forEach((a) => {
					console.log(
						chalk.gray("Provider:"),
						a.providerId,
						chalk.gray("| Account ID:"),
						a.accountId,
					);
				});
			}
		} catch (error) {
			console.error(chalk.red("Error fetching user info:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("delete <userIdOrEmail>")
	.description("Delete a specific user (accepts user ID or email)")
	.option("-f, --force", "Skip confirmation")
	.action(async (userIdOrEmail, options) => {
		try {
			const userToDelete = await findUserByIdOrEmail(userIdOrEmail);

			if (!userToDelete) {
				console.log(chalk.red(`User ${userIdOrEmail} not found`));
				return;
			}

			console.log(chalk.yellow(`\nUser to delete:`));
			console.log(chalk.gray("ID:"), userToDelete.id);
			console.log(chalk.gray("Email:"), userToDelete.email);
			console.log(chalk.gray("Name:"), userToDelete.name || "N/A");

			if (!options.force) {
				const confirmed = await confirm({
					message: chalk.red("Are you sure you want to delete this user?"),
					default: false,
				});

				if (!confirmed) {
					console.log(chalk.gray("Deletion cancelled"));
					return;
				}
			}

			await db.delete(user).where(eq(user.id, userToDelete.id));
			console.log(
				chalk.green(
					`✓ User ${userToDelete.email} (${userToDelete.id}) deleted successfully`,
				),
			);
		} catch (error) {
			console.error(chalk.red("Error deleting user:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("delete-all")
	.description("Delete all users (DANGEROUS!)")
	.option("-f, --force", "Skip confirmation")
	.action(async (options) => {
		try {
			const userCount = await db
				.select({ count: user.id })
				.from(user)
				.then((res) => res.length);

			console.log(
				chalk.red(`\n⚠️  WARNING: This will delete ${userCount} users!`),
			);

			if (!options.force) {
				const confirmed = await confirm({
					message: chalk.red("Are you ABSOLUTELY sure? This cannot be undone!"),
					default: false,
				});

				if (!confirmed) {
					console.log(chalk.gray("Deletion cancelled"));
					return;
				}

				const doubleCheck = await input({
					message: chalk.red('Type "DELETE ALL USERS" to confirm:'),
				});

				if (doubleCheck !== "DELETE ALL USERS") {
					console.log(chalk.gray("Deletion cancelled"));
					return;
				}
			}

			await db.delete(user);
			console.log(chalk.green(`✓ All ${userCount} users deleted successfully`));
		} catch (error) {
			console.error(chalk.red("Error deleting all users:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("set-flag <userIdOrEmail>")
	.description(
		"Set user flags (accepts user ID or email) - interactive prompts will guide you",
	)
	.action(async (userIdOrEmail) => {
		try {
			const userToUpdate = await findUserByIdOrEmail(userIdOrEmail);

			if (!userToUpdate) {
				console.log(chalk.red(`User ${userIdOrEmail} not found`));
				return;
			}

			console.log(chalk.bold("\nCurrent User Status:"));
			console.log(chalk.gray("Email:"), userToUpdate.email);
			console.log(
				chalk.gray("Email Verified:"),
				userToUpdate.emailVerified ? chalk.green("Yes") : chalk.red("No"),
			);
			console.log(
				chalk.gray("Onboarding Completed:"),
				userToUpdate.onboardingCompleted ? chalk.green("Yes") : chalk.red("No"),
			);

			const flag = await select({
				message: "Which flag do you want to modify?",
				choices: [
					{ name: "Email Verification", value: "emailVerified" },
					{ name: "Onboarding Status", value: "onboardingCompleted" },
					{ name: "Both", value: "both" },
				],
			});

			const updates: Partial<typeof userToUpdate> = {};

			if (flag === "emailVerified" || flag === "both") {
				const emailVerified = await confirm({
					message: "Set email as verified?",
					default: !userToUpdate.emailVerified,
				});
				updates.emailVerified = emailVerified;
			}

			if (flag === "onboardingCompleted" || flag === "both") {
				const onboardingCompleted = await confirm({
					message: "Set onboarding as completed?",
					default: !userToUpdate.onboardingCompleted,
				});
				updates.onboardingCompleted = onboardingCompleted;
			}

			await db.update(user).set(updates).where(eq(user.id, userToUpdate.id));

			console.log(chalk.green("\n✓ User flags updated successfully"));
			if (updates.emailVerified !== undefined) {
				console.log(
					chalk.gray("Email Verified:"),
					updates.emailVerified ? chalk.green("Yes") : chalk.red("No"),
				);
			}
			if (updates.onboardingCompleted !== undefined) {
				console.log(
					chalk.gray("Onboarding Completed:"),
					updates.onboardingCompleted ? chalk.green("Yes") : chalk.red("No"),
				);
			}
		} catch (error) {
			console.error(chalk.red("Error setting user flag:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("credits <userIdOrEmail>")
	.description("Manage user credits (accepts user ID or email)")
	.option("-a, --add <amount>", "Add credits")
	.option("-r, --remove <amount>", "Remove credits")
	.option("-s, --set <amount>", "Set credits to specific amount")
	.action(async (userIdOrEmail, options) => {
		try {
			// First find the user
			const userInfo = await findUserByIdOrEmail(userIdOrEmail);
			if (!userInfo) {
				console.log(chalk.red(`User ${userIdOrEmail} not found`));
				return;
			}

			const userOrgs = await getUserCredits(userInfo.id);

			if (userOrgs.length === 0) {
				console.log(chalk.red(`User ${userInfo.email} has no organizations`));
				return;
			}

			let selectedOrgId: string;

			if (userOrgs.length === 1) {
				selectedOrgId = userOrgs[0].organizationId;
				console.log(
					chalk.gray("Organization:"),
					userOrgs[0].organizationName,
					chalk.gray("| Current Credits:"),
					chalk.yellow(`$${Number(userOrgs[0].credits).toFixed(2)}`),
				);
			} else {
				console.log(chalk.bold("\nUser Organizations:"));
				userOrgs.forEach((org) => {
					console.log(
						chalk.gray(`${org.organizationName}:`),
						chalk.yellow(`$${Number(org.credits).toFixed(2)}`),
						chalk.gray(`(${org.organizationId})`),
					);
				});

				selectedOrgId = await select({
					message: "Select organization to modify credits:",
					choices: userOrgs.map((org) => ({
						name: `${org.organizationName} ($${Number(org.credits).toFixed(2)})`,
						value: org.organizationId,
					})),
				});
			}

			const selectedOrg = userOrgs.find(
				(o) => o.organizationId === selectedOrgId,
			)!;
			let newCredits = Number(selectedOrg.credits);

			if (options.add) {
				const amount = parseFloat(options.add);
				if (isNaN(amount) || amount < 0) {
					console.log(chalk.red("Invalid amount"));
					return;
				}
				newCredits = Number(selectedOrg.credits) + amount;
				console.log(
					chalk.gray(`Adding $${amount.toFixed(2)} to current balance`),
				);
			} else if (options.remove) {
				const amount = parseFloat(options.remove);
				if (isNaN(amount) || amount < 0) {
					console.log(chalk.red("Invalid amount"));
					return;
				}
				newCredits = Math.max(0, Number(selectedOrg.credits) - amount);
				console.log(
					chalk.gray(`Removing $${amount.toFixed(2)} from current balance`),
				);
			} else if (options.set) {
				const amount = parseFloat(options.set);
				if (isNaN(amount) || amount < 0) {
					console.log(chalk.red("Invalid amount"));
					return;
				}
				newCredits = amount;
				console.log(chalk.gray(`Setting credits to $${amount.toFixed(2)}`));
			} else {
				const action = await select({
					message: "What would you like to do?",
					choices: [
						{ name: "Add credits", value: "add" },
						{ name: "Remove credits", value: "remove" },
						{ name: "Set specific amount", value: "set" },
					],
				});

				const amount = await input({
					message: `Enter amount${action === "set" ? "" : " to " + action}:`,
					validate: (value) => {
						const num = parseFloat(value);
						if (isNaN(num) || num < 0) {
							return "Please enter a valid positive number";
						}
						return true;
					},
				});

				const numAmount = parseFloat(amount);

				switch (action) {
					case "add":
						newCredits = Number(selectedOrg.credits) + numAmount;
						break;
					case "remove":
						newCredits = Math.max(0, Number(selectedOrg.credits) - numAmount);
						break;
					case "set":
						newCredits = numAmount;
						break;
				}
			}

			await db
				.update(organization)
				.set({ credits: newCredits })
				.where(eq(organization.id, selectedOrgId));

			console.log(chalk.green("\n✓ Credits updated successfully"));
			console.log(chalk.gray("Organization:"), selectedOrg.organizationName);
			console.log(
				chalk.gray("Previous Credits:"),
				chalk.yellow(`$${Number(selectedOrg.credits).toFixed(2)}`),
			);
			console.log(
				chalk.gray("New Credits:"),
				chalk.green(`$${newCredits.toFixed(2)}`),
			);
		} catch (error) {
			console.error(chalk.red("Error managing credits:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("find-by-email <email>")
	.description("Find user by email")
	.action(async (email) => {
		try {
			const userInfo = await db
				.select()
				.from(user)
				.where(eq(user.email, email.toLowerCase()))
				.limit(1)
				.then((users) => users[0]);

			if (!userInfo) {
				console.log(chalk.red(`No user found with email: ${email}`));
				return;
			}

			console.log(chalk.green(`\n✓ User found!`));
			console.log(chalk.gray("ID:"), chalk.bold(userInfo.id));
			console.log(chalk.gray("Email:"), userInfo.email);
			console.log(chalk.gray("Name:"), userInfo.name || chalk.gray("Not set"));
			console.log(
				chalk.gray("Email Verified:"),
				userInfo.emailVerified ? chalk.green("Yes") : chalk.red("No"),
			);
			console.log(chalk.gray("Created:"), formatDate(userInfo.createdAt));
		} catch (error) {
			console.error(chalk.red("Error finding user:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

program
	.command("cleanup-sessions")
	.description("Clean up expired sessions")
	.action(async () => {
		try {
			const now = new Date();
			const result = await db
				.delete(session)
				.where(eq(session.expiresAt, now))
				.returning({ id: session.id });

			console.log(
				chalk.green(`✓ Cleaned up ${result.length} expired sessions`),
			);
		} catch (error) {
			console.error(chalk.red("Error cleaning up sessions:"), error);
			process.exit(1);
		} finally {
			await closeDatabase();
			process.exit(0);
		}
	});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
	program.outputHelp();
	process.exit(0);
}
