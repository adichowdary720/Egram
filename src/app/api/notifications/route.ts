import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        await connectMongo();
        const payload = await req.json();

        const { userId, type, sourceUserId, postId, message } = payload;

        if (!userId || !type) {
            return NextResponse.json({ error: "userId and type are required" }, { status: 400 });
        }

        const notification = await Notification.create({
            userId,
            type,
            sourceUserId,
            postId,
            message
        });

        // Optionally fetch the source user details to return immediately
        let populatedNotif = notification;
        if (sourceUserId) {
            populatedNotif = await Notification.findById(notification._id)
                .populate({
                    path: 'sourceUserId',
                    model: User,
                    localField: 'sourceUserId',
                    foreignField: 'firebaseUid',
                    select: 'name avatarUrl email'
                });
        }

        return NextResponse.json({ success: true, notification: populatedNotif }, { status: 201 });
    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
