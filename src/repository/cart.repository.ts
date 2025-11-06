import mongoose from "mongoose";
import cartModel from "../models/cart.model";
import { DiscountCalculationResult } from "./discount.repository";

export interface CartItemInput {
  product: string;
  quantity: number;
  karat: 9 | 14 | 18;
  sku: string;
  price: number;
  selectedImage: string;
}

export interface ApplyVoucherInput {
    code: string;
    voucherId: string;
    name: string;
    amount: number;
    discountAmount: number;
}

export interface UpdateCartItemInput {
  quantity?: number;
  karat?: 9 | 14 | 18;
  sku?: string;
  price?: number;
  selectedImage?: string;
}

export interface ApplyDiscountInput {
  code: string;
  type: 'coupon' | 'voucher'; 
}

export interface RemoveDiscountInput {
  type: 'coupon' | 'voucher' | 'all';
}

export class CartRepository {
    private _model = cartModel

    async getCartByUserId(userId: string) {
        return this._model.findOne({ user: userId });
    }

    async createCart(userId: string) {
        return this._model.create({ user: userId, items: [] }); 
    }

    async addItemToCart(userId: string, item: CartItemInput) {
        const existingCart = await this._model.findOne({
            user: userId,
            'items.product': item.product,
            'items.karat': item.karat,
            'items.sku': item.sku
        });

        if(existingCart) {
            return this.updateExistingCartItem(userId, item);
        }

        return this._model.findOneAndUpdate(
            { user: userId },
            { $push: { items: item }},
            { new: true, upsert: true }
        )
    }

    private async updateExistingCartItem(userId: string, item: CartItemInput) {
        return this._model.findOneAndUpdate(
            { 
                user: userId,
                'items.product': item.product,
                'items.karat': item.karat,
                'items.sku': item.sku
            },
            { 
                $inc: { 'items.$.quantity': item.quantity },
                $set: { 
                    'items.$.addedAt': new Date(),
                    'items.$.price': item.price // Update price in case it changed
                }
            },
            { new: true }
        );
    }

    async updateCartItem(userId: string, itemId: string, updateData: UpdateCartItemInput) {
        const update: any = { 
            'items.$.addedAt': new Date()
        };
        
        if (updateData.quantity !== undefined) {
            update['items.$.quantity'] = updateData.quantity;
        }
        if (updateData.karat !== undefined) {
            update['items.$.karat'] = updateData.karat;
        }
        if (updateData.sku !== undefined) {
            update['items.$.sku'] = updateData.sku;
        }
        if (updateData.price !== undefined) {
            update['items.$.price'] = updateData.price;
        }
        if (updateData.selectedImage !== undefined) {
            update['items.$.selectedImage'] = updateData.selectedImage;
        }

        return this._model.findOneAndUpdate(
            { user: userId, 'items._id': itemId },
            { $set: update },
            { new: true }
        );
    }

    async removeItemFromCart(userId: string, itemId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { _id: new mongoose.Types.ObjectId(itemId) } } },
            { new: true }
        );
    }

    async getCartBySessionId(sessionId: string) {
        return this._model.findOne({ sessionId, isActive: true });
    }

    async createGuestCart(sessionId: string) {
        return this._model.create({ 
            sessionId, 
            items: [], 
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
        });
    }

    async getOrCreateGuestCart(sessionId: string) {
        let cart = await this.getCartBySessionId(sessionId);
        if (!cart) {
            cart = await this.createGuestCart(sessionId);
        }
        return cart;
    }

    async applyDiscount(userId: string, type: 'coupon' | 'voucher', result: DiscountCalculationResult) {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { 
                $set: { 
                    [updateField]: {
                        code: result.appliedDiscount.code,
                        discountId: result.appliedDiscount.discountId,
                        discountAmount: result.discountAmount
                    }
                } 
            },
            { new: true }
        );
    }

    async applyGiftCard(userId: string, giftCardData: { code: string; giftCardId: string; redeemedAmount: number }) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { 
                $set: { 
                    appliedGiftCard: {
                        code: giftCardData.code,
                        giftCardId: giftCardData.giftCardId,
                        redeemedAmount: giftCardData.redeemedAmount
                    }
                } 
            },
            { new: true }
        );
    }

    async clearGiftCard(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $unset: { appliedGiftCard: 1 } },
            { new: true }
        );
    }

    async clearCartItems(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );
    }

    async deleteCart(userId: string) {
        return this._model.findOneAndDelete({ user: userId });
    }

    async clearDiscount(userId: string, type: 'coupon' | 'voucher') {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { $unset: { [updateField]: 1 } },
            { new: true }
        );
    }

    async replaceCartItems(userId: string, items: CartItemInput[]) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $set: { items } },
            { new: true, upsert: true }
        );
    }

    async addItemToCartBySessionId(sessionId: string, item: CartItemInput) {
        const existingCart = await this._model.findOne({
            sessionId,
            isActive: true,
            'items.product': item.product,
            'items.karat': item.karat,
            'items.sku': item.sku
        })

        if(existingCart) {
            return this.updateExistingCartItemBySessionId(sessionId, item);
        }

        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $push: { items: item } },
            { new: true, upsert: true }
        )
    }

    private async updateExistingCartItemBySessionId(sessionId: string, item: CartItemInput) {
        return this._model.findOneAndUpdate(
            { 
                sessionId,
                isActive: true,
                'items.product': item.product,
                'items.karat': item.karat,
                'items.sku': item.sku
            },
            { 
                $inc: { 'items.$.quantity': item.quantity },
                $set: { 
                    'items.$.addedAt': new Date(),
                    'items.$.price': item.price // Update price in case it changed
                }
            },
            { new: true }
        );
    }

    async updateCartItemBySessionId(sessionId: string, itemId: string, updateData: UpdateCartItemInput) {
        const update: any = { 
            'items.$.addedAt': new Date() 
        };
        
        if (updateData.quantity !== undefined) {
            update['items.$.quantity'] = updateData.quantity;
        }
        if (updateData.karat !== undefined) {
            update['items.$.karat'] = updateData.karat;
        }
        if (updateData.sku !== undefined) {
            update['items.$.sku'] = updateData.sku;
        }
        if (updateData.price !== undefined) {
            update['items.$.price'] = updateData.price;
        }
        if (updateData.selectedImage !== undefined) {
            update['items.$.selectedImage'] = updateData.selectedImage;
        }

        return this._model.findOneAndUpdate(
            { sessionId, 'items._id': itemId, isActive: true },
            { $set: update },
            { new: true }
        );
    }

    async applyVoucher(userId: string, voucherData: ApplyVoucherInput) {
        return this._model.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    appliedVoucher: {
                        code: voucherData.code,
                        voucherId: voucherData.voucherId,
                        name: voucherData.name,
                        amount: voucherData.amount,
                        discountAmount: voucherData.discountAmount,
                        appliedAt: new Date()
                    }
                }
            },
            { new: true }
        );
    }

    async clearVoucher(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            {
                $unset: { appliedVoucher: "" }
            },
            { new: true }
        );
    }

    // Update the existing removeDiscount method to handle vouchers
    async removeDiscount(userId: string, type: 'coupon' | 'voucher' | 'all') {
        const updateQuery: any = {};
        
        if (type === 'coupon' || type === 'all') {
            updateQuery.$unset = { ...updateQuery.$unset, appliedCoupon: "" };
        }
        
        if (type === 'voucher' || type === 'all') {
            updateQuery.$unset = { ...updateQuery.$unset, appliedVoucher: "" };
        }
        
        return this._model.findOneAndUpdate(
            { user: userId },
            updateQuery,
            { new: true }
        );
    }

    async removeItemFromCartBySessionId(sessionId: string, itemId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $pull: { items: { _id: new mongoose.Types.ObjectId(itemId) } } },
            { new: true }
        );
    }

    async transferGuestCartToUser(sessionId: string, userId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { 
                $set: { user: new mongoose.Types.ObjectId(userId) },
                $unset: { sessionId: 1 }
            },
            { new: true }
        );
    }
    
    async deleteGuestCart(sessionId: string) {
        return this._model.findOneAndDelete({ sessionId, isActive: true });
    }

    async checkItemExists(userId: string, productId: string, karat: number, sku: string) {
        return this._model.findOne({
            user: userId,
            'items.product': productId,
            'items.karat': karat,
            'items.sku': sku
        });
    }

    async getCartItem(userId: string, productId: string, karat: number, sku: string) {
        const cart = await this._model.findOne({
            user: userId,
            'items.product': productId,
            'items.karat': karat,
            'items.sku': sku
        });

        if (!cart) return null;

        const item = cart.items.find(item => 
            item.product.toString() === productId &&
            item.karat === karat &&
            item.sku === sku
        );

        return item || null;
    }
}