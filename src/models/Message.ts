import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId?: string; // Optional if groupId is set
    groupId?: string; // Optional if receiverId is set
    content: string;
    isRead: boolean;
    createdAt: Date;
}

const MessageSchema: Schema = new Schema({
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, index: true },
    groupId: { type: String, index: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL index: 24 hours (86400 seconds)
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
