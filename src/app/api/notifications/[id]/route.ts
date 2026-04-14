import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectMongo();
        const userId = (await params).id;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(30)
            .populate({
                path: 'sourceUserId',
                model: User,
                localField: 'sourceUserId',
                foreignField: 'firebaseUid',
                select: 'name avatarUrl email'
            });

        return NextResponse.json({ success: true, notifications }, { status: 200 });

    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
