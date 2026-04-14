import mongoose, { Schema, Document } from 'mongoose';

export interface IFollower extends Document {
    followerId: string; // The user who is following
    followingId: string; // The user being followed
    createdAt: Date;
}

const FollowerSchema: Schema = new Schema({
    followerId: { type: String, required: true, index: true },
    followingId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
});

// Ensure a user cannot follow the same person twice
FollowerSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export default mongoose.models.Follower || mongoose.model<IFollower>('Follower', FollowerSchema);
