import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        karat: {
            type: Number,
            enum: [9, 14, 18],
            required: true,
        },
        sku: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        selectedImage: {
            type: String,
            required: true,
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Types.ObjectId,
            required: false,
        },
        items: [cartItemSchema],
        appliedCoupon: {
            code: String,
            discountId: mongoose.Types.ObjectId,
            discountAmount: Number
        },
        appliedGiftCard: {
            code: String,
            giftCardId: mongoose.Types.ObjectId,
            redeemedAmount: Number
        },
        appliedVoucher: {
            code: {
                type: String,
            },
            voucherId: {
                type: mongoose.Types.ObjectId,
            },
            name: {
                type: String,
            },
            amount: {
                type: Number,
            },
            discountAmount: {
                type: Number,
            },
            appliedAt: {
                type: Date,
            }
        },
        sessionId: {
            type: String,
            sparse: true,
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

// Indexes for better query performance
cartItemSchema.index({ product: 1, karat: 1, sku: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ user: 1, isActive: 1 });

export interface ICartItem extends mongoose.Document {
    _id: string;
    product: mongoose.Types.ObjectId;
    quantity: number;
    karat: 9 | 14 | 18;
    sku: string;
    price: number;
    selectedImage: string;
    addedAt: Date;
}

export interface ICart extends mongoose.Document {
    _id: string;
    user?: mongoose.Types.ObjectId;
    items: ICartItem[];
    appliedCoupon?: {
        code: string;
        discountId: string;
        type: string;
        discountType: string;
        value: number;
        discountAmount: number;
        discountedTotal: number;
        appliedAt: Date;
    };
    appliedVoucher?: {
        code: string;
        voucherId: string;
        name: string;
        amount: number;
        discountAmount: number;
        appliedAt: Date;
    };
    appliedGiftCard?: {
        code: string;
        giftCardId: string;
        redeemedAmount: number;
        appliedAt: Date;
    };
    sessionId?: string;
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<ICart>('Cart', cartSchema);