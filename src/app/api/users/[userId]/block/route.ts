import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function PUT(req: Request, { params }: { params: { userId: string } }) {
    try {
        await connectDB();
        const { targetUserId, action } = await req.json();

        if (!targetUserId || !action || !params.userId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const user = await User.findOne({ firebaseUid: params.userId });
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        if (action === 'block') {
            // Add to blocked users if not already there
            if (!user.blockedUsers) user.blockedUsers = [];
            if (!user.blockedUsers.includes(targetUserId)) {
                user.blockedUsers.push(targetUserId);
                await user.save();
            }
            return NextResponse.json({ success: true, message: 'User blocked successfully', blockedUsers: user.blockedUsers });
        } else if (action === 'unblock') {
            // Remove from blocked users
            if (user.blockedUsers) {
                user.blockedUsers = user.blockedUsers.filter((id: string) => id !== targetUserId);
                await user.save();
            }
            return NextResponse.json({ success: true, message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
        } else {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error handling block/unblock:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
