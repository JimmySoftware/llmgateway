import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useAuth } from "@/lib/auth-client";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	const navigate = useNavigate();
	const { useSession } = useAuth();
	const session = useSession();

	useEffect(() => {
		// Only redirect if we're sure there's no session
		// Don't redirect while session is loading to prevent race conditions
		if (!session.isPending && session.data === null) {
			navigate({ to: "/login", replace: true });
		}
	}, [session.data, session.isPending, navigate]);

	// Show loading state while session is being fetched
	if (session.isPending) {
		return (
			<div className="bg-background min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
					<p className="mt-4 text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background min-h-screen">
			<div className="flex min-h-screen flex-col">
				<header className="border-b">
					<div className="container mx-auto flex h-16 items-center px-4">
						<div className="flex items-center gap-2">
							<span className="text-xl font-bold">LLM Gateway</span>
						</div>
					</div>
				</header>
				<main className="flex-1">
					<OnboardingWizard />
				</main>
			</div>
		</div>
	);
}
