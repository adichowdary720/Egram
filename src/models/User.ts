import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    firebaseUid: string;
    name: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    coverImage?: string;
    followers: string[];
    following: string[];
    followersCount: number;
    followingCount: number;
    skills: string[];
    website?: string;
    usernameHistory: { name: string; changedAt: Date }[];
    chatWallpapers?: Record<string, string>; // Map of contactUid -> wallpaperUrl
    currentStreak: number;
    longestStreak: number;
    lastLoginDate?: Date;
    allowScreenshotNotifications: boolean;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 160 },
    coverImage: { type: String },
    followers: [{ type: String }],
    following: [{ type: String }],
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    skills: [{ type: String }],
    website: { type: String },
    usernameHistory: [{
        name: { type: String, required: true },
        changedAt: { type: Date, default: Date.now }
    }],
    chatWallpapers: { type: Map, of: String, default: {} },
    blockedUsers: [{ type: String }], // Array of firebaseUids that this user has blocked
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastLoginDate: { type: Date },
    allowScreenshotNotifications: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
