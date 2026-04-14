import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: string; // The user receiving the notification
    type: 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'group_message';
    sourceUserId?: string; // The user who triggered the notification
    postId?: string; // Related post if applicable
    message?: string;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['follow', 'like', 'comment', 'mention', 'message', 'group_message'] },
    sourceUserId: { type: String },
    postId: { type: String },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
