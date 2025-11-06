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

const colorOptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    hexCode: {
        type: String,
        trim: true,
    },
    imageUrls: [imageSchema], 
});

const stoneTypeOptionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['regular_diamond', 'gemstone', 'colored_diamond'],
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    }
});

// Variant schema now includes stone type
const variantSchema = new mongoose.Schema({
    karat: {
        type: Number,
        enum: [9, 14, 18],
        required: true,
    },
    stoneType: {
        type: String,
        enum: ['regular_diamond', 'gemstone', 'colored_diamond'],
        default: 'regular_diamond',
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
            type: mongoose.Types.ObjectId,
            required: true,
        }],
        subCategoryIds: [{
            type: mongoose.Types.ObjectId,
        }],
        collectionIds: [{
            type: mongoose.Types.ObjectId,
        }],
        
        // ============================================
        // CUSTOMIZATION OPTIONS
        // ============================================
        customizationOptions: {
            // Color customization
            hasColorOptions: {
                type: Boolean,
                default: false,
            },
            colors: [colorOptionSchema],
            
            // Size customization (for rings, bangles)
            hasSizeOptions: {
                type: Boolean,
                default: false,
            },
            sizes: [{
                type: String,
                enum: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
            }],
            
            // Stone type customization
            hasStoneTypeOptions: {
                type: Boolean,
                default: false,
            },
            stoneTypes: [stoneTypeOptionSchema],
        },
        
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
        
        // Variants - now includes combinations of karat + stone type
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

export interface IColorOption {
    name: string;
    hexCode?: string;
    imageUrls?: IImageUrl[];
}

export interface IStoneTypeOption {
    type: 'regular_diamond' | 'gemstone' | 'colored_diamond';
    label: string;
    isAvailable: boolean;
}

export interface ICustomizationOptions {
    hasColorOptions: boolean;
    colors: IColorOption[];
    hasSizeOptions: boolean;
    sizes: string[];
    hasStoneTypeOptions: boolean;
    stoneTypes: IStoneTypeOption[];
}

export interface IVariant {
    karat: 9 | 14 | 18;
    stoneType: 'regular_diamond' | 'gemstone' | 'colored_diamond';
    sku: string;
    price: number;
    stock: number;
    grossWeight: number;
    isAvailable: boolean;
}

export interface IProduct extends mongoose.Document {
    _id: string;
    productId: string;
    name: string;
    categoryIds: mongoose.Types.ObjectId[];
    subCategoryIds?: mongoose.Types.ObjectId[];
    collectionIds?: mongoose.Types.ObjectId[];
    customizationOptions: ICustomizationOptions;
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