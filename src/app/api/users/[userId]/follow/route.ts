import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import Follower from "@/models/Follower";
import Notification from "@/models/Notification";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        await connectMongo();

        // This is the user being followed/unfollowed
        const targetUserId = (await params).userId;

        // This is the current user performing the action
        const { followerId } = await req.json();

        if (!followerId || !targetUserId) {
            return NextResponse.json({ error: "Missing user IDs" }, { status: 400 });
        }

        const follower = await User.findOne({ firebaseUid: followerId });
        const targetUser = await User.findOne({ firebaseUid: targetUserId });

        if (!follower || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Use the Follower collection to determine follow status
        const followRecord = await Follower.findOne({ followerId, followingId: targetUserId });
        const isFollowing = !!followRecord;

        if (isFollowing) {
            // Unfollow logic
            await Follower.deleteOne({ _id: followRecord._id });

            await User.updateOne({ firebaseUid: followerId }, {
                $pull: { following: targetUserId },
                $inc: { followingCount: -1 }
            });
            await User.updateOne({ firebaseUid: targetUserId }, {
                $pull: { followers: followerId },
                $inc: { followersCount: -1 }
            });

            return NextResponse.json({ message: "Unfollowed successfully", isFollowing: false }, { status: 200 });
        } else {
            // Follow logic
            await Follower.create({ followerId, followingId: targetUserId });

            await User.updateOne({ firebaseUid: followerId }, {
                $addToSet: { following: targetUserId },
                $inc: { followingCount: 1 }
            });
            await User.updateOne({ firebaseUid: targetUserId }, {
                $addToSet: { followers: followerId },
                $inc: { followersCount: 1 }
            });

            // Create notification for target user
            await Notification.create({
                userId: targetUserId,
                type: 'follow',
                sourceUserId: followerId,
                message: `${follower.name} started following you.`
            });

            return NextResponse.json({ message: "Followed successfully", isFollowing: true }, { status: 200 });
        }

    } catch (error: any) {
        console.error("Error toggling follow:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
