import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
    try {
        await connectMongo();

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");
        const currentUserId = searchParams.get("uid");

        if (!query) {
            return NextResponse.json([], { status: 200 });
        }

        // Perform case-insensitive regex search on the "name" field
        const searchRegex = new RegExp(query, "i");

        const filter: any = { name: { $regex: searchRegex } };

        // Allow searching for oneself by removing the $ne filter
        // We will add an "It's You" badge on the frontend instead of completely hiding the user.
        // if (currentUserId) { ... }

        const users = await User.find(filter).limit(20);

        return NextResponse.json(users, { status: 200 });

    } catch (error: any) {
        console.error("Error searching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
