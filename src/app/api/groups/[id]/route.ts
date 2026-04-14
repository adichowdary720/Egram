import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Group from '@/models/Group';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectMongo();
        const group = await Group.findById(params.id);
        if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        return NextResponse.json({ success: true, group });
    } catch (error) {
        console.error("Error fetching group:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectMongo();
        const { action, userId, requesterId } = await req.json();

        const group = await Group.findById(params.id);
        if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

        const isAdmin = group.adminIds.includes(requesterId);

        if (action === 'add_member') {
            // Check if requester is admin OR if they joined via invite (logic for invite joining would usually be separate, 
            // but for simplicity we'll handle join-via-link here if requesterId === userId)
            // Actually, we'll implement a 'join' route later or handle it here.
            if (!group.memberIds.includes(userId)) {
                group.memberIds.push(userId);
                await group.save();
            }
            return NextResponse.json({ success: true, group });
        } else if (action === 'remove_member') {
            if (!isAdmin && requesterId !== userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            group.memberIds = group.memberIds.filter((id: string) => id !== userId);
            group.adminIds = group.adminIds.filter((id: string) => id !== userId);

            // If no members left, maybe delete group? For now just save.
            await group.save();
            return NextResponse.json({ success: true, group });
        } else if (action === 'make_admin') {
            if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            if (!group.adminIds.includes(userId)) {
                group.adminIds.push(userId);
                await group.save();
            }
            return NextResponse.json({ success: true, group });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error("Error updating group:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
