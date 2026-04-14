import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
    name: string;
    avatarUrl?: string;
    adminIds: string[];
    memberIds: string[];
    createdAt: Date;
}

const GroupSchema: Schema = new Schema({
    name: { type: String, required: true },
    avatarUrl: { type: String },
    adminIds: [{ type: String, required: true }],
    memberIds: [{ type: String, required: true }],
    inviteLink: { type: String, unique: true, sparse: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
