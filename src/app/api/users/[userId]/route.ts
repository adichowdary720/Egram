import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        await connectMongo();
        const userId = (await params).userId;

        const user = await User.findOne({ firebaseUid: userId });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        await connectMongo();
        const userId = (await params).userId;
        const body = await req.json();

        // Find user first to evaluate history
        console.log("[PUT /api/users/[userId]] Attempting to update user:", userId);
        let user = await User.findOne({ firebaseUid: userId });

        if (!user) {
            console.error("[PUT /api/users/[userId]] User NOT found in MongoDB for firebaseUid:", userId);
            return NextResponse.json({ error: "User not found in database" }, { status: 404 });
        }
        console.log("[PUT /api/users/[userId]] User found:", user.email);

        const dbUpdate: any = { $set: {} };

        // Update name and record in history if it changed
        if (body.name && body.name !== user.name) {
            const now = new Date();
            const currentHistory = user.usernameHistory || [];
            dbUpdate.$set.usernameHistory = [...currentHistory, { name: body.name, changedAt: now }];
        }

        // Ensure we only update allowed fields
        const allowedUpdates = ["bio", "name", "avatarUrl", "coverImage", "website", "skills", "allowScreenshotNotifications"];
        for (const key of allowedUpdates) {
            if (body[key] !== undefined) {
                dbUpdate.$set[key] = body[key];
            }
        }

        // Special handling for the chatWallpapers Map to merge instead of overwrite if needed, 
        // but for now, expecting full object or direct dot-notation paths is fine.
        if (body.chatWallpapers !== undefined) {
            dbUpdate.$set.chatWallpapers = body.chatWallpapers;
        }

        // If no $set operations, remove it so Mongoose doesn't complain
        if (Object.keys(dbUpdate.$set).length === 0) {
            delete dbUpdate.$set;
        }

        user = await User.findOneAndUpdate(
            { firebaseUid: userId },
            dbUpdate,
            { new: true }
        );

        return NextResponse.json(user, { status: 200 });

    } catch (error: any) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
