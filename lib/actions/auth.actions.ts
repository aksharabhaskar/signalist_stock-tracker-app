"use server";
import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { redirect } from "next/navigation";
import {headers} from "next/headers";
export const signUpWithEmail = async (data: SignUpFormData) => {
    const {
        email,
        password,
        fullName,
        country,
        investmentGoals,
        riskTolerance,
        preferredIndustry,
    } = data;

    try {
        const instance = await auth();
        const response = await instance.api.signUpEmail({
            body: { email, password, name: fullName },
        });

        if (response) {
            await inngest.send({
                name: "app/user.created",
                data: {
                    email,
                    name: fullName,
                    country,
                    investmentGoals,
                    riskTolerance,
                    preferredIndustry,
                },
            });
        }
    } catch (e) {
        console.error("Sign up failed", e);
        throw new Error("Sign up failed");
    }

    // redirect() MUST be called outside try-catch
    // It throws a NEXT_REDIRECT error which is normal Next.js behavior
    redirect("/");
}

export const signInWithEmail = async (data: SignInFormData) => {
    const { email, password } = data;

    try {
        const instance = await auth();
        const response = await instance.api.signInEmail({
            body: { email, password },
        });

        if (!response) {
            throw new Error("Sign in failed");
        }

        // Return success if we reach here
        return { success: true };
    } catch (e) {
        console.error("Sign in failed", e);
        return { success: false, error: "Sign in failed" };
    }
}

export const signOut = async () => {
    try {
        const instance = await auth();
        await instance.api.signOut({ headers: await headers() });
    } catch (e) {
        console.error("Sign out failed", e);
        throw new Error("Sign out failed");
    }

    redirect("/sign-in");
};