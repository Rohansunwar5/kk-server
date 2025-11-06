import { NextFunction, Request, Response } from 'express';
import giftCardService, { IPurchaseGiftCardParams } from '../services/giftcard.service';
import { BadRequestError } from '../errors/bad-request.error';
import { IUpdateGiftCardParams } from '../repository/giftcard.repository';

export const purchaseGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const {
        amount,
        occasion,
        recipientName,
        recipientEmail,
        recipientPhone,
        message,
        imageUrl,
        validityMonths,
        purchaseOrderId
    } = req.body;

    if (!amount || !recipientName || !recipientEmail || !purchaseOrderId) {
        throw new BadRequestError('Amount, recipient name, recipient email, and purchase order ID are required');
    }

    const purchaseParams: IPurchaseGiftCardParams = {
        amount,
        occasion,
        recipientName,
        recipientEmail,
        recipientPhone,
        senderId: userId,
        message,
        imageUrl,
        validityMonths,
        purchaseOrderId
    };

    const response = await giftCardService.purchaseGiftCard(purchaseParams);
    next(response);
};

export const getGiftCardById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequestError('Gift card ID is required');
    }

    const response = await giftCardService.getGiftCardById(id);
    next(response);
};

export const getGiftCardByCode = async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.params;

    if (!code) {
        throw new BadRequestError('Gift card code is required');
    }

    const response = await giftCardService.getGiftCardByCode(code);
    next(response);
};

export const getMyPurchasedGiftCards = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const response = await giftCardService.getMyPurchasedGiftCards(userId);
    next(response);
};

export const getMyReceivedGiftCards = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const response = await giftCardService.getMyReceivedGiftCards(userId);
    next(response);
};

export const getAllGiftCards = async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, senderId, recipientEmail, searchTerm } = req.query;

    const response = await giftCardService.getAllGiftCards({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        senderId: senderId as string,
        recipientEmail: recipientEmail as string,
        searchTerm: searchTerm as string
    });

    next(response);
};

export const updateGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updateData: IUpdateGiftCardParams = req.body;

    if (!id) {
        throw new BadRequestError('Gift card ID is required');
    }

    const response = await giftCardService.updateGiftCard(id, updateData);
    next(response);
};

export const activateGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequestError('Gift card ID is required');
    }

    const response = await giftCardService.activateGiftCard(id);
    next(response);
};

export const checkGiftCardBalance = async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.params;

    if (!code) {
        throw new BadRequestError('Gift card code is required');
    }

    const response = await giftCardService.checkGiftCardBalance(code);
    next(response);
};

export const validateGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { code, amount } = req.body;

    if (!code || !amount) {
        throw new BadRequestError('Gift card code and amount are required');
    }

    const response = await giftCardService.validateGiftCardForRedemption(code, amount);
    next(response);
};

export const redeemGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const { code, amount, orderId } = req.body;

    if (!code || !amount || !orderId) {
        throw new BadRequestError('Gift card code, amount, and order ID are required');
    }

    const response = await giftCardService.redeemGiftCard({
        code,
        userId,
        amount,
        orderId
    });

    next(response);
};

export const cancelGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const { id } = req.params;

    if (!id) {
        throw new BadRequestError('Gift card ID is required');
    }

    const response = await giftCardService.cancelGiftCard(id, userId);
    next(response);
};

export const getGiftCardUsageHistory = async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.params;

    if (!code) {
        throw new BadRequestError('Gift card code is required');
    }

    const response = await giftCardService.getGiftCardUsageHistory(code);
    next(response);
};

export const getExpiredGiftCards = async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit } = req.query;

    const response = await giftCardService.getExpiredGiftCards(
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
    );

    next(response);
};

export const markExpiredGiftCards = async (req: Request, res: Response, next: NextFunction) => {
    const response = await giftCardService.markExpiredGiftCards();
    next(response);
};

export const deleteGiftCard = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequestError('Gift card ID is required');
    }

    const response = await giftCardService.deleteGiftCard(id);
    next(response);
};