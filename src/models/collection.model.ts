import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100,
        },
        imageUrls: [{
            type: String,
            trim: true,
        }],
        description: {
            type: String,
            default: "",
            maxLength: 1000,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

collectionSchema.index({ name: 1 });
collectionSchema.index({ name: 'text', description: 'text' });

export interface ICollection extends mongoose.Document {
    _id: string;
    name: string;
    imageUrls: string[];
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<ICollection>('Collection', collectionSchema);