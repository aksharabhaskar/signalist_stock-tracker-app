import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connectToDatabase } from "@/database/mongoose";
import { nextCookies } from "better-auth/next-js";

export const getAuth = async () => {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) throw new Error("Database not connected");

    const authInstance = betterAuth({
        database: mongodbAdapter(db as any),

        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,

        // enable password auth provider so signup/signin methods exist
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
        },

        // enable optional password reset flows
        emailAndPasswordReset: {
            enabled: true,
            disableSignin: false,
        },

        plugins: [nextCookies()],
    });

    return authInstance;
};

// Create a fresh auth instance for each request
export const auth = async () => await getAuth();
