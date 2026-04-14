import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        await connectMongo();
        const { uid, email, displayName, photoURL } = await req.json();

        if (!uid || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user exists, if not create one
        let user = await User.findOne({ firebaseUid: uid });

        if (!user) {
            user = await User.create({
                firebaseUid: uid,
                email,
                name: displayName || email.split("@")[0],
                avatarUrl: photoURL || "",
            });
            return NextResponse.json({ message: "User created", user }, { status: 201 });
        } else {
            // Update basic info to keep sync
            user.name = displayName || user.name;
            user.avatarUrl = photoURL || user.avatarUrl;
            await user.save();
        }

        return NextResponse.json({ message: "User synced", user }, { status: 200 });

    } catch (error: any) {
        console.error("Error syncing user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
