import mongoose from "mongoose";

export enum IGiftCardStatus {
    PENDING = 'pending',      // Purchased but not sent yet
    ACTIVE = 'active',        // Sent and ready to use
    REDEEMED = 'redeemed',    // Fully used
    EXPIRED = 'expired',      // Past valid date
    CANCELLED = 'cancelled'   // Cancelled by admin
}

export enum IOccasion {
    BIRTHDAY = 'birthday',
    ANNIVERSARY = 'anniversary',
    WEDDING = 'wedding',
    CHRISTMAS = 'christmas',
    VALENTINES = 'valentines',
    MOTHERS_DAY = 'mothers_day',
    FATHERS_DAY = 'fathers_day',
    DIWALI = 'diwali',
    EID = 'eid',
    GRADUATION = 'graduation',
    THANK_YOU = 'thank_you',
    CONGRATULATIONS = 'congratulations',
    GENERAL = 'general'
}

const giftCardSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        remainingAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        occasion: {
            type: String,
            enum: Object.values(IOccasion),
            default: IOccasion.GENERAL,
        },
        recipientName: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100,
        },
        recipientEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        recipientPhone: {
            type: String,
            trim: true,
        },
        senderId: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        senderName: {
            type: String,
            required: true,
            trim: true,
        },
        senderEmail: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            default: "",
            maxLength: 500,
        },
        imageUrl: {
            type: String,
            trim: true,
        },
        validUpto: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(IGiftCardStatus),
            default: IGiftCardStatus.PENDING,
        },
        usedBy: [{
            userId: mongoose.Types.ObjectId,
            usedAmount: Number,
            usedAt: Date,
            orderId: String,
        }],
        purchaseOrderId: {
            type: String,
            required: true,
        },
        sentAt: {
            type: Date,
        },
        redeemedAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Indexes for better query performance
giftCardSchema.index({ code: 1 });
giftCardSchema.index({ senderId: 1 });
giftCardSchema.index({ recipientEmail: 1 });
giftCardSchema.index({ status: 1, isActive: 1 });
giftCardSchema.index({ validUpto: 1, status: 1 });

export interface IGiftCardUsage {
    userId: mongoose.Types.ObjectId;
    usedAmount: number;
    usedAt: Date;
    orderId: string;
}

export interface IGiftCard extends mongoose.Document {
    _id: string;
    code: string;
    amount: number;
    remainingAmount: number;
    occasion: IOccasion;
    recipientName: string;
    recipientEmail: string;
    recipientPhone?: string;
    senderId: mongoose.Types.ObjectId;
    senderName: string;
    senderEmail: string;
    message: string;
    imageUrl?: string;
    validUpto: Date;
    status: IGiftCardStatus;
    usedBy: IGiftCardUsage[];
    purchaseOrderId: string;
    sentAt?: Date;
    redeemedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<IGiftCard>('GiftCard', giftCardSchema);