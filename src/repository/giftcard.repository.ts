import giftcardModel, { IGiftCard, IGiftCardStatus, IOccasion } from "../models/giftcard.model";

export interface ICreateGiftCardParams {
    code: string;
    amount: number;
    occasion: IOccasion;
    recipientName: string;
    recipientEmail: string;
    recipientPhone?: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    message?: string;
    imageUrl?: string;
    validUpto: Date;
    purchaseOrderId: string;
}

export interface IUpdateGiftCardParams {
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    message?: string;
    imageUrl?: string;
    validUpto?: Date;
    status?: IGiftCardStatus;
    isActive?: boolean;
}

export interface IGetAllGiftCardsParams {
    page: number;
    limit: number;
    status?: IGiftCardStatus;
    senderId?: string;
    recipientEmail?: string;
    searchTerm?: string;
}

export interface IRedeemGiftCardParams {
    code: string;
    userId: string;
    amount: number;
    orderId: string;
}

export class GiftCardRepository {
    private _model = giftcardModel;

    async createGiftCard(params: ICreateGiftCardParams): Promise<IGiftCard> {
        return this._model.create({
            ...params,
            remainingAmount: params.amount,
            status: IGiftCardStatus.PENDING,
        })
    }

    async getGiftCardById(id: string) {
        return this._model.findById(id);
    }

    async getGiftCardByCode(code: string) {
        return this._model.findOne({ code });
    }

    async getGiftCardsBySenderId(senderId: string) {
        return this._model.find({ senderId, isactive: true }).sort({ createdAt: -1 });
    }

    async getGiftCardsByRecipientEmail(recipientEmail: string): Promise<IGiftCard[]> {
        return this._model.find({ 
            recipientEmail, 
            status: { $in: [IGiftCardStatus.ACTIVE, IGiftCardStatus.REDEEMED] },
            isActive: true 
        }).sort({ createdAt: -1 });
    }

    async getAllGiftCards(params: IGetAllGiftCardsParams) {
        const { page, limit, status, senderId, recipientEmail, searchTerm } = params;
        const skip = (page -1 ) * limit;
        const filter: any = {  isActive: true};

        if(status) {
            filter.status = status;
        }

        if(senderId) {
            filter.senderId = senderId;
        }

        if(recipientEmail) {
            filter.recipientEmail = recipientEmail;
        }

        if(searchTerm) {
            filter.$or = [
                { code: { $regex: searchTerm, $options: 'i' } },
                { recipientName: { $regex: searchTerm, $options: 'i' } },
                { recipientEmail: { $regex: searchTerm, $options: 'i' } },
                { senderName: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const [giftCards, total] = await Promise.all([
            this._model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            this._model.countDocuments(filter)
        ])
        return {
            giftCards,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit
        };
    }

    async updateGiftCardById(id: string, params: IUpdateGiftCardParams): Promise<IGiftCard | null> {
        return this._model.findByIdAndUpdate(id, params, { new: true });
    }

    async updateGiftCardStatus(id: string, status: IGiftCardStatus): Promise<IGiftCard | null> {
        const updateData: any = { status };
        
        if (status === IGiftCardStatus.ACTIVE) {
            updateData.sentAt = new Date();
        } else if (status === IGiftCardStatus.REDEEMED) {
            updateData.redeemedAt = new Date();
        }

        return this._model.findByIdAndUpdate(id, updateData, { new: true });
    }

    async redeemGiftCard(params: IRedeemGiftCardParams): Promise<IGiftCard | null> {
        const { code, userId, amount, orderId } = params;

        return this._model.findOneAndUpdate(
            { code },
            {
                $inc: { remainingAmount: -amount },
                $push: {
                    usedBy: {
                        userId,
                        usedAmount: amount,
                        usedAt: new Date(),
                        orderId
                    }
                }
            },
            { new: true }
        );
    }

    async deleteGiftCard(id: string): Promise<{ deletedCount: number }> {
        return this._model.deleteOne({ _id: id });
    }

    async softDeleteGiftCard(id: string): Promise<IGiftCard | null> {
        return this._model.findByIdAndUpdate(
            id,
            { isActive: false, status: IGiftCardStatus.CANCELLED },
            { new: true }
        );
    }

    async getExpiredGiftCards(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        
        const [giftCards, total] = await Promise.all([
            this._model
                .find({ 
                    validUpto: { $lt: new Date() },
                    status: { $ne: IGiftCardStatus.EXPIRED }
                })
                .sort({ validUpto: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments({ 
                validUpto: { $lt: new Date() },
                status: { $ne: IGiftCardStatus.EXPIRED }
            })
        ]);

        return {
            giftCards,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async markExpiredGiftCards(): Promise<number> {
        const result = await this._model.updateMany(
            {
                validUpto: { $lt: new Date() },
                status: { $in: [IGiftCardStatus.PENDING, IGiftCardStatus.ACTIVE] }
            },
            { status: IGiftCardStatus.EXPIRED }
        );

        return result.modifiedCount;
    }

    async getGiftCardUsageHistory(code: string): Promise<IGiftCard | null> {
        return this._model.findOne({ code }).select('code amount remainingAmount usedBy status').lean();
    }

    async checkGiftCardAvailability(code: string): Promise<{
        available: boolean;
        remainingAmount: number;
        status: string;
    } | null> {
        const giftCard = await this._model.findOne({ code });
        
        if (!giftCard) return null;

        return {
            available: giftCard.status === IGiftCardStatus.ACTIVE && giftCard.remainingAmount > 0,
            remainingAmount: giftCard.remainingAmount,
            status: giftCard.status
        };
    }
}
