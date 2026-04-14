import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Post from "@/models/Post";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectMongo();
        const { id } = await params;
        const { userId } = await req.json();

        if (!id || !userId) {
            return NextResponse.json({ error: "Post ID and User ID are required" }, { status: 400 });
        }

        const post = await Post.findById(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const index = post.likes.indexOf(userId);
        if (index > -1) {
            // Un-like
            post.likes.splice(index, 1);
        } else {
            // Like
            post.likes.push(userId);
        }

        await post.save();

        return NextResponse.json({ success: true, likes: post.likes }, { status: 200 });

    } catch (error: any) {
        console.error("Error liking post:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
