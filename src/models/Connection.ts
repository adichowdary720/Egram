import mongoose, { Schema, Document } from 'mongoose';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface IConnection extends Document {
    requester: mongoose.Types.ObjectId;
    recipient: mongoose.Types.ObjectId;
    status: ConnectionStatus;
    createdAt: Date;
    updatedAt: Date;
}

const ConnectionSchema: Schema = new Schema(
    {
        requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate connection requests between the same two users
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.models.Connection || mongoose.model<IConnection>('Connection', ConnectionSchema);
