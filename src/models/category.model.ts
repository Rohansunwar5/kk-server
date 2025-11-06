import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        categoryId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100,
        },
        subCategoryIds: [{
            type: mongoose.Types.ObjectId,
        }],
        imageUrl: [{
            type: String,
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

categorySchema.index({ categoryId: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ name: 'text', description: 'text' });

export interface ICategory extends mongoose.Document {
    _id: string;
    categoryId: mongoose.Types.ObjectId;
    name: string;
    subCategoryIds?: string[];
    imageUrl?: string[];
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<ICategory>('Category', categorySchema);