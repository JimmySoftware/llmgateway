import { createFileRoute } from "@tanstack/react-router";

import { CodeExample } from "@/components/landing/code-example";
import CallToAction from "@/components/landing/cta";
import { Faq } from "@/components/landing/faq";
import Features from "@/components/landing/features";
import Footer from "@/components/landing/footer";
import { Graph } from "@/components/landing/graph";
import { Hero } from "@/components/landing/hero";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { ProductHuntBanner } from "@/components/shared/product-hunt-banner";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
			<main>
				<ProductHuntBanner />
				<Hero />
				<Features />
				<Graph />
				<CodeExample />
				<PricingPlans />
				<Faq />
				<CallToAction />
			</main>
			<Footer />
		</div>
	);
}
