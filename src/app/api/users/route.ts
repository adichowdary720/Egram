import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import User from '@/models/User';

// GET all users
export async function GET() {
    try {
        // Wait for the database connection
        await connectMongo();

        // Fetch users using the Mongoose model
        const users = await User.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: users }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST a new user
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, avatarUrl } = body;

        if (!name || !email) {
            return NextResponse.json(
                { success: false, error: 'Name and email are required' },
                { status: 400 }
            );
        }

        // Wait for the database connection
        await connectMongo();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Create a new user
        const newUser = await User.create({ name, email, avatarUrl });

        return NextResponse.json({ success: true, data: newUser }, { status: 201 });
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create user' },
            { status: 500 }
        );
    }
}
