"use server";

import { type AuthError, createClient } from "@/lib/supabase";
import { initializeAccount } from "@/services/accounts";
import { createCheckout } from "@/services/external/stripe/actions";
import { redirect } from "next/navigation";

export const verifyEmail = async (
	prevState: null | AuthError,
	formData: FormData,
): Promise<AuthError | null> => {
	const verificationEmail = formData.get("verificationEmail") as string;
	const token = formData.get("token") as string;
	const supabase = createClient();
	const { data: supabaseData, error } = await supabase.auth.verifyOtp({
		email: verificationEmail,
		token,
		type: "email",
	});
	console.log(JSON.stringify(error));
	if (error != null) {
		return {
			code: error.code,
			message: error.message,
			status: error.status,
			name: error.name,
		};
	}
	if (supabaseData.user == null) {
		return {
			code: "unknown",
			status: 500,
			message: "No user returned",
			name: "UnknownError",
		};
	}

	const user = await initializeAccount(supabaseData.user.id);
	const checkout = await createCheckout(user.id, verificationEmail);

	redirect(checkout.url as string);
};
