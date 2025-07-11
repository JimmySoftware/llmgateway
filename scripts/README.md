# LLMGateway Scripts

This directory contains utility scripts for managing the LLMGateway application.

## User Management Script

A comprehensive CLI tool for managing users in the LLMGateway database.

### Quick Start

```bash
# Get help on all commands
pnpm users --help

# Get help on a specific command
pnpm users help set-flag
pnpm users help credits
```

### Installation

```bash
# From the llmgateway root directory
pnpm install
```

### Usage

```bash
# From anywhere in the project (recommended)
pnpm users <command> [options]

# From the scripts directory
pnpm user <command> [options]

# Or directly with tsx
tsx scripts/user-management.ts <command> [options]
```

### Available Commands

#### List Users

```bash
pnpm user list [options]
```

Options:

- `-l, --limit <number>` - Limit number of results (default: 50)
- `-s, --search <query>` - Search users by email or name
- `-v, --verified` - Show only verified users
- `-u, --unverified` - Show only unverified users

#### View User Information

```bash
pnpm user info <userIdOrEmail>
```

Shows detailed information including:

- Basic user details
- Organization memberships and credits
- Recent sessions
- Linked accounts

**Note:** You can use either the user ID or email address.

#### Find User by Email

```bash
pnpm user find-by-email <email>
```

Returns the user ID for a given email address.

#### Delete User

```bash
pnpm user delete <userIdOrEmail> [options]
```

Options:

- `-f, --force` - Skip confirmation prompt

**Note:** You can use either the user ID or email address.

#### Delete All Users (DANGEROUS!)

```bash
pnpm user delete-all [options]
```

Options:

- `-f, --force` - Skip confirmation prompt

#### Set User Flags

```bash
pnpm user set-flag <userIdOrEmail>
```

Interactively modify user flags:

- Email verification status
- Onboarding completion status

The command will:

1. Show the current status of the user
2. Ask which flag you want to modify (email verification, onboarding, or both)
3. Ask whether to set each flag to true or false

Example interaction:

```
$ pnpm users set-flag abc123def456

Current User Status:
Email: user@example.com
Email Verified: No
Onboarding Completed: No

? Which flag do you want to modify? (Use arrow keys)
❯ Email Verification
  Onboarding Status
  Both

? Set email as verified? (Y/n)
```

#### Manage User Credits

```bash
pnpm user credits <userIdOrEmail> [options]
```

Options:

- `-a, --add <amount>` - Add credits
- `-r, --remove <amount>` - Remove credits
- `-s, --set <amount>` - Set credits to specific amount

If no options provided, interactive mode will guide you.

#### Clean Up Expired Sessions

```bash
pnpm user cleanup-sessions
```

### Examples

```bash
# List all unverified users
pnpm users list --unverified

# Search for users with "john" in their email or name
pnpm users list --search john

# View detailed info for a specific user (using ID)
pnpm users info abc123def456

# View detailed info for a specific user (using email)
pnpm users info user@example.com

# Add $50 credits to a user (using ID)
pnpm users credits abc123def456 --add 50

# Add $50 credits to a user (using email)
pnpm users credits user@example.com --add 50

# Set a user's email as verified (using ID)
pnpm users set-flag abc123def456

# Set a user's email as verified (using email)
pnpm users set-flag user@example.com

# Delete a user without confirmation (using ID)
pnpm users delete abc123def456 --force

# Delete a user without confirmation (using email)
pnpm users delete user@example.com --force

# Find user by email
pnpm users find-by-email john@example.com

# Clean up expired sessions
pnpm users cleanup-sessions
```

### Environment Variables

The script uses the same database configuration as the main application. Ensure your `.env` file contains:

```env
DATABASE_URL=postgres://user:password@localhost:5432/database
```
