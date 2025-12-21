import React from 'react'
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/Header"; // Add your Header import

const Layout = async ({ children }: { children: React.ReactNode }) => {
    // Get the auth instance first, then call the API
    const instance = await auth();
    const session = await instance.api.getSession({ headers: await headers() });

    // Debug: Check what's in the session
    console.log("Session user data:", JSON.stringify(session?.user, null, 2));

    if (!session?.user) redirect('/sign-in');

    return (
        <main className="min-h-screen text-gray-400">
            <Header user={session.user} />
            <div className="container py-10">
                {children}
            </div>
        </main>
    )
}

export default Layout