import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema(
    {
        subCategoryId: {
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
        parentCategoryId: {
            type: String,
            required: true,
        },
        productIds: [{
            type: String,
        }],
        bannerIds: [{
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

// Indexes for better query performance
subCategorySchema.index({ subCategoryId: 1 });
subCategorySchema.index({ name: 1 });
subCategorySchema.index({ parentCategoryId: 1 });
subCategorySchema.index({ name: 'text', description: 'text' });

export interface ISubCategory extends mongoose.Document {
    _id: string;
    subCategoryId: string;
    name: string;
    parentCategoryId: string;
    productIds?: string[];
    bannerIds?: string[];
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<ISubCategory>('SubCategory', subCategorySchema);