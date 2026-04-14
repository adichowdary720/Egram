import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectMongo();
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "notifId is required" }, { status: 400 });
        }

        const notification = await Notification.findByIdAndUpdate(
            id,
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, notification }, { status: 200 });

    } catch (error: any) {
        console.error("Error marking notification read:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
