import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        selectedVariant: {
            karat: {
                type: Number,
                enum: [9, 14, 18],
            },
            sku: {
                type: String,
                trim: true,
                uppercase: true,
            },
            stoneType: {
                type: String,
                enum: ['regular_diamond', 'gemstone', 'colored_diamond'],
            },
            priceWhenAdded: {
                type: Number,
            }
        },
        preferences: {
            selectedColor: {
                name: String,
                hexCode: String,
            },
            selectedSize: {
                type: String,
                enum: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
            },
            selectedImage: String,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
        // Keep for backward compatibility
        priceWhenAdded: {
            type: Number,
        },
        // NEW: Track if price has changed
        currentPrice: {
            type: Number,
        },
        priceDropAlert: {
            type: Boolean,
            default: false,
        }
    }
);

const wishlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        items: [wishlistItemSchema],
        isPublic: {
            type: Boolean,
            default: false,
        },
        name: {
            type: String,
            default: "My Wishlist",
        },
    }, 
    { timestamps: true }
);

wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });
wishlistSchema.index({ 'items.selectedVariant.sku': 1 });

export interface IWishlistItemPreferences {
    selectedColor?: {
        name: string;
        hexCode?: string;
    };
    selectedSize?: string;
    selectedImage?: string;
}

export interface IWishlistItemVariant {
    karat?: 9 | 14 | 18;
    sku?: string;
    stoneType?: 'regular_diamond' | 'gemstone' | 'colored_diamond';
    priceWhenAdded?: number;
}

export interface IWishlistItem {
    _id: string;
    product: mongoose.Types.ObjectId;
    selectedVariant?: IWishlistItemVariant;
    preferences?: IWishlistItemPreferences;
    addedAt: Date;
    priceWhenAdded?: number;
    currentPrice?: number;
    priceDropAlert?: boolean;
}

export interface IWishlist extends mongoose.Document {
    _id: string;
    user: mongoose.Types.ObjectId;
    items: IWishlistItem[];
    isPublic: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<IWishlist>('Wishlist', wishlistSchema);