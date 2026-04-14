import mongoose, { Schema, Document } from 'mongoose';

export interface IComment {
    user: string; // Firebase UID
    text: string;
    createdAt: Date;
}

export interface IPost extends Document {
    author: string; // Firebase UID
    content: string;
    images: string[];
    likes: string[]; // Array of Firebase UIDs
    comments: IComment[];
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
    user: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
});

const PostSchema: Schema = new Schema(
    {
        author: { type: String, required: true },
        content: { type: String, required: true, maxlength: 5000 },
        images: [{ type: String }],
        likes: [{ type: String }],
        comments: [CommentSchema],
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Add index for faster feed queries (sorting by newest first)
PostSchema.index({ createdAt: -1 });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
