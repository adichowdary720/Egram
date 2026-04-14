import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic'; // Prevent aggressive caching of the feed

// GET posts (Supports ?type=following&userId=UID)
export async function GET(req: Request) {
    try {
        await connectMongo();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const userId = searchParams.get('userId');

        let query = {};

        if (type === 'following' && userId) {
            // Get the list of people the user follows
            const followingDocs = await mongoose.model('Follower').find({ followerId: userId });
            const followingIds = followingDocs.map(doc => doc.followingId);
            query = { author: { $in: followingIds } };
        }

        // Fetch posts
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(20) // Reduced limit for better performance and stability
            .lean();

        // Manually "populate" author details since we use Firebase UIDs as strings
        const postsWithAuthors = await Promise.all(posts.map(async (post: any) => {
            const author = await User.findOne({ firebaseUid: post.author })
                .select('name avatarUrl email firebaseUid')
                .lean();
            return { ...post, author };
        }));

        return NextResponse.json({ success: true, data: postsWithAuthors }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}

// POST a new post
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { authorId, content, images } = body;

        if (!authorId || !content) {
            return NextResponse.json(
                { success: false, error: 'Author ID and content are required' },
                { status: 400 }
            );
        }

        await connectMongo();

        // Verify user exists before creating post
        const user = await User.findOne({ firebaseUid: authorId });
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Author not found' },
                { status: 404 }
            );
        }

        const newPost = await Post.create({
            author: authorId,
            content,
            images: images || [],
        });

        return NextResponse.json({ success: true, data: newPost }, { status: 201 });
    } catch (error) {
        console.error('Failed to create post:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create post' },
            { status: 500 }
        );
    }
}
