import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        required: true,
    }
});

// Variant schema for different karat options
const variantSchema = new mongoose.Schema({
    karat: {
        type: Number,
        enum: [9, 14, 18],
        required: true,
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    grossWeight: {
        type: Number,
        min: 0,
        default: 0,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    }
});

const productSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            maxLength: 200,
        },
        categoryIds: [{
            type: String,
            required: true,
        }],
        subCategoryIds: [{
            type: String,
        }],
        collectionIds: [{
            type: String,
        }],
        // Base weights (same across all karat variants)
        goldWeight: {
            type: Number,
            min: 0,
            default: 0,
        },
        diamondWeight: {
            type: Number,
            min: 0,
            default: 0,
        },
        netWeight: {
            type: Number,
            required: true,
            min: 0,
        },
        solitareWeight: {
            type: Number,
            min: 0,
            default: 0,
        },
        noOfSolitares: {
            type: Number,
            min: 0,
            default: 0,
        },
        noOfMultiDiamonds: {
            type: Number,
            min: 0,
            default: 0,
        },
        multiDiamondWeight: {
            type: Number,
            min: 0,
            default: 0,
        },
        totalKarats: [{
            type: Number,
            min: 0,
        }],
        gender: {
            type: String,
            enum: ["Male", "Female", "Unisex"],
        },
        shapeOfSolitare: {
            type: String,
            trim: true,
        },
        shapeOfMultiDiamonds: {
            type: String,
            trim: true,
        },
        shapeOfPointers: {
            type: String,
            trim: true,
        },
        noOfPointers: {
            type: Number,
            min: 0,
            default: 0,
        },
        gemStoneColour: [{
            type: String,
            trim: true,
        }],
        description: {
            type: String,
            default: "",
            maxLength: 2000,
        },
        quantitySold: {
            type: Number,
            default: 0,
            min: 0,
        },
        imageUrl: [imageSchema],
        isPendantFixed: {
            type: Boolean,
            default: false,
        },
        containsGemstone: {
            type: Boolean,
            default: false,
        },
        gemStoneWeightSol: {
            type: Number,
            default: 0,
            min: 0,
        },
        isMrpProduct: {
            type: Boolean,
            default: false,
        },
        pointersWeight: {
            type: Number,
            default: 0,
            min: 0,
        },
        gemStoneWeightPointer: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Karat variants - each product can have multiple karat options
        variants: [variantSchema],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Indexes for better query performance
productSchema.index({ productId: 1 });
productSchema.index({ categoryIds: 1 });
productSchema.index({ collectionIds: 1 });
productSchema.index({ 'variants.price': 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ name: 'text', description: 'text' });

export interface IImageUrl {
    url: string;
    publicId: string;
}

export interface IVariant {
    karat: 9 | 14 | 18;
    sku: string; // Unique SKU for this variant (e.g., "RING001-14K")
    price: number;
    stock: number;
    grossWeight: number;
    isAvailable: boolean;
}

export interface IProduct extends mongoose.Document {
    _id: string;
    productId: string;
    name: string;
    categoryIds: string[];
    subCategoryIds?: string[];
    collectionIds?: string[];
    goldWeight: number;
    diamondWeight: number;
    netWeight: number;
    solitareWeight: number;
    noOfSolitares: number;
    noOfMultiDiamonds: number;
    multiDiamondWeight: number;
    totalKarats?: number[];
    gender?: "Male" | "Female" | "Unisex";
    shapeOfSolitare?: string;
    shapeOfMultiDiamonds?: string;
    shapeOfPointers?: string;
    noOfPointers: number;
    gemStoneColour?: string[];
    description: string;
    quantitySold: number;
    imageUrl: IImageUrl[];
    isPendantFixed: boolean;
    containsGemstone: boolean;
    gemStoneWeightSol: number;
    isMrpProduct: boolean;
    pointersWeight: number;
    gemStoneWeightPointer: number;
    variants: IVariant[]; 
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<IProduct>('Product', productSchema);