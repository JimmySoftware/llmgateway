import { loadStripe } from "@stripe/stripe-js/pure";
import { useEffect, useState } from "react";

import type { Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise() {
	if (!stripePromise) {
		stripePromise = loadStripe(
			process.env.NODE_ENV === "development"
				? "pk_test_51OR46OG0AAe1zaJuugBLEaGl1Zv0JmF6nSrYWTujKcQn7a5Xy0QTgADUrIvCSz8aKPl7edclnj88vqYhQrWTDaj100fwe7s0fb"
				: "pk_test_51OR46OG0AAe1zaJuugBLEaGl1Zv0JmF6nSrYWTujKcQn7a5Xy0QTgADUrIvCSz8aKPl7edclnj88vqYhQrWTDaj100fwe7s0fb",
		);
	}
	return stripePromise;
}

export function useStripe() {
	const [stripe, setStripe] = useState<Stripe | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		getStripePromise()
			.then((stripeInstance) => {
				setStripe(stripeInstance);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err);
				setIsLoading(false);
			});
	}, []);

	return { stripe, isLoading, error };
}

export function loadStripeNow() {
	return getStripePromise();
}
