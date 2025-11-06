import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
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
        minimumValue: {
            type: Number,
            required: true,
            min: 0,
        },
        used: {
            type: Boolean,
            required: true,
            default: false,
        },
        startFrom: {
            type: Date,
            required: true,
        },
        validUpto: {
            type: Date,
            required: true,
        },
        usedBy: {
            type: mongoose.Types.ObjectId,
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
        },
    }, 
    { timestamps: true }
);

voucherSchema.index({ code: 1 });
voucherSchema.index({ used: 1, validUpto: 1 });
voucherSchema.index({ startFrom: 1, validUpto: 1 });

export interface IVoucher extends mongoose.Document {
    _id: string;
    name: string;
    code: string;
    amount: number;
    minimumValue: number;
    used: boolean;
    startFrom: Date;
    validUpto: Date;
    usedBy?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<IVoucher>('Voucher', voucherSchema);