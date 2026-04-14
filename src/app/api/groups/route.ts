import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Group from "@/models/Group";

export async function POST(req: Request) {
    try {
        await connectMongo();
        const { name, avatarUrl, adminIds, memberIds } = await req.json();

        if (!name || !adminIds || !adminIds.length || !memberIds || !memberIds.length) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const inviteLink = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const newGroup = await Group.create({
            name,
            avatarUrl,
            adminIds,
            memberIds,
            inviteLink
        });

        return NextResponse.json({ success: true, group: newGroup }, { status: 201 });
    } catch (error) {
        console.error("Error creating group:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        await connectMongo();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const inviteLink = searchParams.get('inviteLink');

        if (inviteLink) {
            const group = await Group.findOne({ inviteLink });
            if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
            return NextResponse.json({ success: true, group }, { status: 200 });
        }

        if (!userId) {
            return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
        }

        // Find all groups where the user is a member
        const groups = await Group.find({ memberIds: userId }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: groups }, { status: 200 });
    } catch (error) {
        console.error("Error fetching groups:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
