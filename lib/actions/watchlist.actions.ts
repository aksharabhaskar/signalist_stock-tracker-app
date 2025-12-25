"use server";

import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";

export const getWatchlistSymbolsByEmail = async (email: string): Promise<string[]> => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;

        if (!db) throw new Error("Database not connected");

        // Find user by email in users collection (changed from "user" to "users")
        const user = await db.collection("users").findOne({ email });

        if (!user) {
            console.log(`No user found with email: ${email}`);
            return [];
        }

        // Use _id and convert to string (users collection only has _id, not id)
        const userId = user._id?.toString();

        if (!userId) {
            console.log(`User found but no ID for email: ${email}`);
            return [];
        }

        console.log(`User ${email} has ID: ${userId}`);

        // Query watchlist by userId
        const watchlistItems = await Watchlist.find({ userId }).select("symbol").lean();

        console.log(`User ${email} has ${watchlistItems.length} watchlist symbols`);

        // Return just the symbols as strings
        return watchlistItems.map(item => item.symbol);

    } catch (error) {
        console.error("Error fetching watchlist symbols:", error);
        return [];
    }
};