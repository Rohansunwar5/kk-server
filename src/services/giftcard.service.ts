import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { IGiftCardStatus } from "../models/giftcard.model";
import { GiftCardRepository, ICreateGiftCardParams, IUpdateGiftCardParams,IRedeemGiftCardParams } from "../repository/giftcard.repository";
import { UserRepository } from "../repository/user.repository";

export interface IPurchaseGiftCardParams {
    amount: number;
    occasion: string;
    recipientName: string;
    recipientEmail: string;
    recipientPhone?: string;
    senderId: string;
    message?: string;
    imageUrl?: string;
    validityMonths?: number;
    purchaseOrderId: string;
}

export interface IGetAllGiftCardsOptions {
    page?: number;
    limit?: number;
    status?: string;
    senderId?: string;
    recipientEmail?: string;
    searchTerm?: string;
}

export interface IGiftCardRedemptionResult {
    redeemedAmount: number;
    remainingAmount: number;
    giftCardCode: string;
}

class GiftCardService {
    constructor(
        private readonly _giftCardRepository: GiftCardRepository,
        private readonly _userRepository: UserRepository
    ) {}

    async purchaseGiftCard(params: IPurchaseGiftCardParams) {
        // Validate amount
        if (params.amount < 100) {
            throw new BadRequestError('Minimum gift card amount is 100');
        }

        if (params.amount > 100000) {
            throw new BadRequestError('Maximum gift card amount is 100,000');
        }

        // Fetch sender details from user repository
        const sender = await this._userRepository.getUserById(params.senderId);
        if (!sender) {
            throw new NotFoundError('Sender not found');
        }

        // Generate unique code
        const code = await this.generateUniqueCode();

        // Calculate validity date (default 12 months)
        const validityMonths = params.validityMonths || 12;
        const validUpto = new Date();
        validUpto.setMonth(validUpto.getMonth() + validityMonths);

        const giftCardData: ICreateGiftCardParams = {
            code,
            amount: params.amount,
            occasion: params.occasion as any,
            recipientName: params.recipientName,
            recipientEmail: params.recipientEmail,
            recipientPhone: params.recipientPhone,
            senderId: params.senderId,
            senderName: `${sender.firstName} ${sender.lastName || ''}`.trim(),
            senderEmail: sender.email,
            message: params.message || '',
            imageUrl: params.imageUrl,
            validUpto,
            purchaseOrderId: params.purchaseOrderId,
        };

        const giftCard = await this._giftCardRepository.createGiftCard(giftCardData);

        if (!giftCard) {
            throw new InternalServerError('Failed to create gift card');
        }

        return giftCard;
    }

    private async generateUniqueCode(): Promise<string> {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code: string;
        let isUnique = false;

        while (!isUnique) {
            code = 'GC-';
            for (let i = 0; i < 10; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            const existing = await this._giftCardRepository.getGiftCardByCode(code);
            if (!existing) {
                isUnique = true;
                return code;
            }
        }

        throw new InternalServerError('Failed to generate unique gift card code');
    }

    async getGiftCardById(id: string) {
        const giftCard = await this._giftCardRepository.getGiftCardById(id);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        return giftCard;
    }

    async getGiftCardByCode(code: string) {
        const giftCard = await this._giftCardRepository.getGiftCardByCode(code);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        return giftCard;
    }

    async getMyPurchasedGiftCards(senderId: string) {
        return this._giftCardRepository.getGiftCardsBySenderId(senderId);
    }

    async getMyReceivedGiftCards(userId: string) {
        const user = await this._userRepository.getUserById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        const recipientEmail = user.email;
        return this._giftCardRepository.getGiftCardsByRecipientEmail(recipientEmail);
    }

    async getAllGiftCards(options: IGetAllGiftCardsOptions = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            senderId,
            recipientEmail,
            searchTerm
        } = options;

        if (page < 1) throw new BadRequestError('Page must be greater than 0');
        if (limit < 1 || limit > 100) throw new BadRequestError('Limit must be between 1 and 100');

        return this._giftCardRepository.getAllGiftCards({
            page,
            limit,
            status: status as any,
            senderId,
            recipientEmail,
            searchTerm
        });
    }

    async updateGiftCard(id: string, params: IUpdateGiftCardParams) {
        const giftCard = await this._giftCardRepository.getGiftCardById(id);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        // Don't allow updates if already redeemed or expired
        if (giftCard.status === IGiftCardStatus.REDEEMED) {
            throw new BadRequestError('Cannot update redeemed gift card');
        }

        if (giftCard.status === IGiftCardStatus.EXPIRED) {
            throw new BadRequestError('Cannot update expired gift card');
        }

        const updatedGiftCard = await this._giftCardRepository.updateGiftCardById(id, params);

        if (!updatedGiftCard) {
            throw new InternalServerError('Failed to update gift card');
        }

        return updatedGiftCard;
    }

    async activateGiftCard(id: string) {
        const giftCard = await this._giftCardRepository.getGiftCardById(id);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        if (giftCard.status !== IGiftCardStatus.PENDING) {
            throw new BadRequestError('Only pending gift cards can be activated');
        }

        const updatedGiftCard = await this._giftCardRepository.updateGiftCardStatus(
            id,
            IGiftCardStatus.ACTIVE
        );

        if (!updatedGiftCard) {
            throw new InternalServerError('Failed to activate gift card');
        }

        // TODO: Send email to recipient here
        // await emailService.sendGiftCardEmail(updatedGiftCard);

        return updatedGiftCard;
    }

    async validateGiftCardForRedemption(code: string, amount: number) {
        const giftCard = await this._giftCardRepository.getGiftCardByCode(code);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        if (!giftCard.isActive) {
            throw new BadRequestError('Gift card is not active');
        }

        if (giftCard.status === IGiftCardStatus.PENDING) {
            throw new BadRequestError('Gift card has not been activated yet');
        }

        if (giftCard.status === IGiftCardStatus.EXPIRED) {
            throw new BadRequestError('Gift card has expired');
        }

        if (giftCard.status === IGiftCardStatus.CANCELLED) {
            throw new BadRequestError('Gift card has been cancelled');
        }

        if (giftCard.status === IGiftCardStatus.REDEEMED && giftCard.remainingAmount === 0) {
            throw new BadRequestError('Gift card has been fully redeemed');
        }

        const now = new Date();
        if (now > giftCard.validUpto) {
            // Mark as expired
            await this._giftCardRepository.updateGiftCardStatus(giftCard._id, IGiftCardStatus.EXPIRED);
            throw new BadRequestError('Gift card has expired');
        }

        if (amount > giftCard.remainingAmount) {
            throw new BadRequestError(
                `Insufficient gift card balance. Available: ${giftCard.remainingAmount}, Requested: ${amount}`
            );
        }

        return giftCard;
    }

    async redeemGiftCard(params: IRedeemGiftCardParams): Promise<IGiftCardRedemptionResult> {
        const { code, userId, amount, orderId } = params;

        // Validate before redemption
        const giftCard = await this.validateGiftCardForRedemption(code, amount);

        // Redeem the gift card
        const updatedGiftCard = await this._giftCardRepository.redeemGiftCard({
            code,
            userId,
            amount,
            orderId
        });

        if (!updatedGiftCard) {
            throw new InternalServerError('Failed to redeem gift card');
        }

        // If fully redeemed, update status
        if (updatedGiftCard.remainingAmount === 0) {
            await this._giftCardRepository.updateGiftCardStatus(
                updatedGiftCard._id,
                IGiftCardStatus.REDEEMED
            );
        }

        return {
            redeemedAmount: amount,
            remainingAmount: updatedGiftCard.remainingAmount,
            giftCardCode: code
        };
    }

    async cancelGiftCard(id: string, cancelledBy: string) {
        const giftCard = await this._giftCardRepository.getGiftCardById(id);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        // Only sender can cancel pending gift cards
        if (giftCard.senderId.toString() !== cancelledBy && giftCard.status !== IGiftCardStatus.PENDING) {
            throw new BadRequestError('Only pending gift cards can be cancelled by sender');
        }

        if (giftCard.status === IGiftCardStatus.REDEEMED) {
            throw new BadRequestError('Cannot cancel redeemed gift card');
        }

        if (giftCard.usedBy.length > 0) {
            throw new BadRequestError('Cannot cancel gift card that has been partially used');
        }

        const cancelledGiftCard = await this._giftCardRepository.softDeleteGiftCard(id);

        if (!cancelledGiftCard) {
            throw new InternalServerError('Failed to cancel gift card');
        }

        return { message: 'Gift card cancelled successfully', giftCard: cancelledGiftCard };
    }

    async checkGiftCardBalance(code: string) {
        const availability = await this._giftCardRepository.checkGiftCardAvailability(code);

        if (!availability) {
            throw new NotFoundError('Gift card not found');
        }

        return availability;
    }

    async getGiftCardUsageHistory(code: string) {
        const history = await this._giftCardRepository.getGiftCardUsageHistory(code);

        if (!history) {
            throw new NotFoundError('Gift card not found');
        }

        return history;
    }

    async getExpiredGiftCards(page: number = 1, limit: number = 10) {
        return this._giftCardRepository.getExpiredGiftCards(page, limit);
    }

    async markExpiredGiftCards() {
        const count = await this._giftCardRepository.markExpiredGiftCards();
        return { message: `${count} gift cards marked as expired` };
    }

    async deleteGiftCard(id: string) {
        const giftCard = await this._giftCardRepository.getGiftCardById(id);

        if (!giftCard) {
            throw new NotFoundError('Gift card not found');
        }

        // Don't allow hard delete if used
        if (giftCard.usedBy.length > 0) {
            throw new BadRequestError('Cannot delete gift card that has been used. Use cancel instead.');
        }

        const result = await this._giftCardRepository.deleteGiftCard(id);

        if (!result || result.deletedCount === 0) {
            throw new InternalServerError('Failed to delete gift card');
        }

        return { message: 'Gift card deleted successfully' };
    }
}

export default new GiftCardService(new GiftCardRepository(), new UserRepository());