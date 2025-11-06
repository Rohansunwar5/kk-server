import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { ICart } from "../models/cart.model";
import { ApplyDiscountInput, CartItemInput, CartRepository, UpdateCartItemInput } from "../repository/cart.repository";
import discountService from "./discount.service";
import giftcardService from "./giftcard.service";
import voucherService from "./voucher.service";
import productService from "./product.service";

export interface ApplyGiftCardInput {
    code: string;
    amount: number;
}

export interface ApplyVoucherInput {
    code: string;
}

class CartService {
    constructor(private readonly _cartRepository: CartRepository) {}

    async getCartWithDetails(userId: string) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) {
            return { 
                cart, 
                items: [], 
                totals: { 
                    subtotal: 0, 
                    discountAmount: 0, 
                    voucherAmount: 0,
                    giftCardAmount: 0, 
                    total: 0, 
                    itemCount: 0 
                }
            }
        }

        const productIds = cart.items.map(item => item.product.toString());
        const products = await Promise.all(productIds.map(productId => productService.getProductById(productId)));
        const productMap = products.reduce((acc, product) => {
            if (product) { acc[product._id.toString()] = product }
            return acc;
        }, {} as Record<string, any>);

        const itemsWithDetails = cart.items.map(item => {
            const productId = item.product.toString();
            const product = productMap[productId];
            if (!product) throw new NotFoundError(`Product not found for ID: ${productId}`)
            
            const variant = product.variants.find((v: any) => v.sku === item.sku);
            if (!variant) throw new NotFoundError(`Variant not found for SKU: ${item.sku}`);
            
            const itemTotal = item.price * item.quantity;
            return {
                _id: item._id,
                product: {
                    _id: product._id,
                    productId: product.productId,
                    name: product.name,
                    imageUrl: product.imageUrl,
                },
                quantity: item.quantity,
                karat: item.karat,
                sku: item.sku,
                price: item.price,
                variant: {
                    karat: variant.karat,
                    price: variant.price,
                    stock: variant.stock,
                    grossWeight: variant.grossWeight,
                    isAvailable: variant.isAvailable
                },
                selectedImage: item.selectedImage,
                addedAt: item.addedAt,
                itemTotal: itemTotal
            };
        });

        const totals = await this.calculateCartTotal(cart);

        return {
            cart: { 
                _id: cart._id, 
                user: cart.user, 
                appliedCoupon: cart.appliedCoupon, 
                appliedVoucher: cart.appliedVoucher,
                appliedGiftCard: cart.appliedGiftCard 
            },
            items: itemsWithDetails,
            totals: { 
                subtotal: totals.subtotal, 
                discountAmount: totals.discountAmount,
                voucherAmount: totals.voucherAmount,
                giftCardAmount: totals.giftCardAmount,
                total: totals.total, 
                itemCount: totals.items 
            }
        };
    }

    async getGuestCartWithDetails(sessionId: string) {
        const cart = await this.getGuestCart(sessionId);
        if (!cart.items.length) {
            return { cart, items: [], totals: { subtotal: 0, discountAmount: 0, voucherAmount: 0, total: 0, itemCount: 0 } };
        }

        const productIds = cart.items.map(item => item.product.toString());
        const products = await Promise.all(productIds.map(productId => productService.getProductById(productId)));
        const productMap = products.reduce((acc: { [key: string]: any }, product) => {
            if (product) acc[product._id.toString()] = product;
            return acc;
        }, {} as { [key: string]: any });
        
        const itemsWithDetails = cart.items.map(item => {
            const product = productMap[item.product.toString()];
            if (!product) throw new NotFoundError(`Product not found for ID: ${item.product}`);
            
            const variant = product.variants.find((v: any) => v.sku === item.sku);
            if (!variant) throw new NotFoundError(`Variant not found for SKU: ${item.sku}`);
            
            return {
                _id: item._id,
                product: {
                    _id: product._id,
                    productId: product.productId,
                    name: product.name,
                    imageUrl: product.imageUrl,
                },
                quantity: item.quantity,
                karat: item.karat,
                sku: item.sku,
                price: item.price,
                variant: {
                    karat: variant.karat,
                    price: variant.price,
                    stock: variant.stock,
                    grossWeight: variant.grossWeight,
                    isAvailable: variant.isAvailable
                },
                selectedImage: item.selectedImage,
                addedAt: item.addedAt,
                itemTotal: item.price * item.quantity,
            };
        });

        const totals = await this.calculateCartTotal(cart);

        return {
            cart: { _id: cart._id, appliedCoupon: cart.appliedCoupon, appliedVoucher: cart.appliedVoucher },
            items: itemsWithDetails,
            totals: { 
                subtotal: totals.subtotal, 
                discountAmount: totals.discountAmount,
                voucherAmount: totals.voucherAmount,
                total: totals.total, 
                itemCount: totals.items 
            },
        };
    }

    async getCart(userId: string) {
        let cart = await this._cartRepository.getCartByUserId(userId);
        if (!cart) cart = await this._cartRepository.createCart(userId)

        return cart;
    }

    async addItemToCart(userId: string, item: CartItemInput) {
        if (!item.product) throw new BadRequestError('Product ID is required')
        if (!item.karat) throw new BadRequestError('Karat selection is required')
        if (!item.sku) throw new BadRequestError('SKU is required')
        if (!item.price) throw new BadRequestError('Price is required')
        if (!item.selectedImage) throw new BadRequestError('Selected image is required')

        const product = await productService.getProductById(item.product);
        
        if (!product) throw new NotFoundError('Product not found');
        if(!product.isActive) throw new BadRequestError('Product is not available for sale');

        const variant = product.variants.find((v: any) => v.sku === item.sku);
        if (!variant) throw new BadRequestError('Selected variant is not available for this product');
        
        if (!variant.isAvailable) throw new BadRequestError('Selected variant is not available');
        
        if (variant.stock < item.quantity) {
            throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested: ${item.quantity}`);
        }
        
        const cart = await this.getCart(userId);
        const existingItem = cart.items.find(i => 
            i.product.toString() === item.product && 
            i.karat === item.karat &&
            i.sku === item.sku
        );

        let updatedCart;

        if (existingItem) {
           const totalQuantity = existingItem.quantity + item.quantity;

           if(variant.stock < totalQuantity) {
            throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested total: ${totalQuantity}`);
           }

           updatedCart = await this.updateCartItemByProduct(userId, existingItem._id.toString(), {
            quantity: totalQuantity
           });
        } else {
            updatedCart = await this._cartRepository.addItemToCart(userId, {
                ...item,
            })
        }
        
        if (!updatedCart) throw new NotFoundError('Failed to update cart');
        
        // Reapply discounts/vouchers if already applied
        if (updatedCart.appliedCoupon) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedCoupon.code,
                type: 'coupon'
            });
        } else if (updatedCart.appliedVoucher) {
            return this.safeReapplyVoucher(userId, updatedCart.appliedVoucher.code);
        }

        return updatedCart;
    }

    async updateCartItemByProduct(userId: string, itemId: string, updateData: UpdateCartItemInput) {
        const cart = await this.getCart(userId);
        
        const item = cart.items.find(i => i._id.toString() === itemId);
        if (!item) throw new NotFoundError('Item not found in cart')
        
        const product = await productService.getProductById(item.product.toString());
        if (!product || !product.isActive) {
            throw new NotFoundError('Product not found or inactive');
        }
        
        const targetSku = updateData.sku || item.sku;
        const variant = product.variants.find((v: any) => v.sku === targetSku);
        if (!variant) throw new BadRequestError('Selected variant is not available for this product');

        if (!variant.isAvailable) throw new BadRequestError('Selected variant is not available');
        
        if (variant.stock < (updateData.quantity || item.quantity)) {
            throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested: ${updateData.quantity || item.quantity}`);
        }
        
        const updatedCart = await this._cartRepository.updateCartItem(userId, itemId, updateData);
        
        if (!updatedCart) throw new NotFoundError('Failed to update cart item');

        // Reapply discounts/vouchers if already applied
        if (updatedCart.appliedCoupon) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedCoupon.code,
                type: 'coupon'
            });
        } else if (updatedCart.appliedVoucher) {
            return this.safeReapplyVoucher(userId, updatedCart.appliedVoucher.code);
        }
        
        return updatedCart;
    }

    async removeCartItemByProduct(userId: string, productId: string, karat: number, sku: string) {
        const cart = await this.getCart(userId);
        
        const item = cart.items.find(i => 
            i.product.toString() === productId && 
            i.karat === karat &&
            i.sku === sku
        );
        
        if (!item) {
            throw new NotFoundError('Item not found in cart');
        }
        
        return this.removeItemFromCart(userId, item._id.toString());
    }

    async removeItemFromCart(userId: string, itemId: string) {
        const cart = await this.getCart(userId);
        const updatedCart = await this._cartRepository.removeItemFromCart(userId, itemId);
        if (!updatedCart) throw new NotFoundError('Failed to remove item from cart');

        // Reapply discounts/vouchers if already applied
        if (updatedCart.appliedCoupon) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedCoupon.code,
                type: 'coupon'
            });
        } else if (updatedCart.appliedVoucher) {
            return this.safeReapplyVoucher(userId, updatedCart.appliedVoucher.code);
        }

        return updatedCart;
    }

    private async safeReapplyDiscount(userId: string, { code, type }: ApplyDiscountInput) {
        try {
            return await this.applyDiscount(userId, { code, type });
        } catch (error:any) {
            console.warn(`Failed to reapply ${type} discount "${code}":`, error.message);
            
            await this._cartRepository.clearDiscount(userId, type);
            return this.getCart(userId);
        }
    }

    private async safeReapplyVoucher(userId: string, code: string) {
        try {
            return await this.applyVoucher(userId, { code });
        } catch (error:any) {
            console.warn(`Failed to reapply voucher "${code}":`, error.message);
            
            await this._cartRepository.clearVoucher(userId);
            return this.getCart(userId);
        }
    }

    async applyDiscount(userId: string, { code, type }: ApplyDiscountInput) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) throw new BadRequestError('Cart is empty');
        
        const productIds = cart.items.map(item => item.product.toString());
        const products = await Promise.all( productIds.map(productId => productService.getProductById(productId)));
        const productMap = products.reduce((acc, product) => {
            if (product) {
                acc[product._id.toString()] = product;
            }
            return acc;
        }, {} as Record<string, any>);

        const quantities = cart.items.reduce((acc, item) => {
            const productId = item.product.toString();
            acc[productId] = (acc[productId] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        const subtotal = cart.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        const result = await discountService.applyDiscount({ 
            code, 
            productIds, 
            quantities, 
            subtotal 
        });

        return this._cartRepository.applyDiscount(userId, type, result);
    }

    async applyVoucher(userId: string, { code }: ApplyVoucherInput) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) throw new BadRequestError('Cart is empty');

        // Calculate subtotal from cart items
        const subtotal = cart.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Apply voucher through voucher service
        const result = await voucherService.applyVoucher({
            code,
            subtotal
        });

        // Store voucher application in cart
        return this._cartRepository.applyVoucher(userId, {
            code: result.appliedVoucher.code,
            voucherId: result.appliedVoucher.voucherId,
            name: result.appliedVoucher.name,
            amount: result.appliedVoucher.amount,
            discountAmount: result.discountAmount
        });
    }

    async calculateCartTotal(cart: ICart) {
        if (!cart.items.length) {
            return {
                subtotal: 0,
                discountAmount: 0,
                voucherAmount: 0,
                giftCardAmount: 0,
                total: 0,
                items: 0
            };
        }

        const subtotal = cart.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        const discountAmount = (cart.appliedCoupon?.discountAmount || 0);
        const voucherAmount = cart.appliedVoucher?.discountAmount || 0;
        const giftCardAmount = cart.appliedGiftCard?.redeemedAmount || 0;

        // Apply discounts and voucher first, then gift card
        const afterDiscounts = subtotal - discountAmount - voucherAmount;
        const total = Math.max(0, afterDiscounts - giftCardAmount);

        return {
            subtotal,
            discountAmount,
            voucherAmount,
            giftCardAmount,
            total,
            items: cart.items.length
        };
    }

    async clearCartItems(userId: string) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) return cart
        
        return this._cartRepository.clearCartItems(userId);
    }

    async deleteCart(userId: string) {
        return this._cartRepository.deleteCart(userId);
    }

    async getGuestCart(sessionId: string) {
        return this._cartRepository.getOrCreateGuestCart(sessionId);
    }

    async addItemToGuestCart(sessionId: string, item: CartItemInput) {
        if (!item.karat) throw new BadRequestError('Karat selection is required')
        if (!item.sku) throw new BadRequestError('SKU is required')
        if (!item.price) throw new BadRequestError('Price is required')
        if (!item.selectedImage) throw new BadRequestError('Selected image is required')

        const product = await productService.getProductById(item.product);
        if (!product) throw new NotFoundError('Product not found');
        if (!product.isActive) throw new BadRequestError('Product is not available');
        
        const variant = product.variants.find((v: any) => v.sku === item.sku);
        if (!variant) throw new BadRequestError('Selected variant is not available for this product');

        if (!variant.isAvailable) throw new BadRequestError('Selected variant is not available');
        
        if (variant.stock < item.quantity) {
            throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested: ${item.quantity}`);
        }

        let cart = await this._cartRepository.getCartBySessionId(sessionId);
        if (!cart) {
            cart = await this._cartRepository.createGuestCart(sessionId);
        }

        const existingItem = cart.items.find(i => 
            i.product.toString() === item.product && 
            i.karat === item.karat &&
            i.sku === item.sku
        );

        if (existingItem) {
            const totalQuantity = existingItem.quantity + item.quantity;
            
            if (variant.stock < totalQuantity) {
                throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested total: ${totalQuantity}`);
            }
            
            return this._cartRepository.updateCartItemBySessionId(
                sessionId, 
                existingItem._id.toString(), 
                { quantity: totalQuantity }
            );
        } else {
            return this._cartRepository.addItemToCartBySessionId(sessionId, { ...item });
        }
    }

    async validateCartItems(userId?: string, sessionId?: string) {
        const cart = userId 
            ? await this.getCart(userId) 
            : await this.getGuestCart(sessionId!);
        
        if (!cart.items.length) return { valid: true, issues: [] };

        const issues = [];
        const validItems = [];

        for (const item of cart.items) {
            try {
                const product = await productService.getProductById(item.product.toString());
                if (!product || !product.isActive) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: 'Product no longer available'
                    });
                    continue;
                }

                const variant = product.variants.find((v: any) => v.sku === item.sku);
                if (!variant) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: 'Variant no longer available'
                    });
                    continue;
                }

                if (!variant.isAvailable) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: 'Variant is no longer available'
                    });
                    continue;
                }

                if (variant.stock < item.quantity) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: `Only ${variant.stock} items available, but ${item.quantity} requested`
                    });
                    if (variant.stock > 0) {
                        validItems.push({
                            ...item,
                            quantity: Math.min(item.quantity, variant.stock)
                        });
                    }
                    continue;
                }

                validItems.push(item);
            } catch (error) {
                issues.push({
                    itemId: item._id,
                    productId: item.product,
                    issue: 'Error validating product'
                });
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            validItems,
            needsUpdate: issues.length > 0
        };
    }

    async addItemToGuestCartByProduct(sessionId: string, productId: string, addData: { quantity: number; karat: number; sku: string; price: number; selectedImage: string }) {
        const product = await productService.getProductById(productId);
        if (!product || !product.isActive) throw new NotFoundError('Product not found or inactive');
        
        const variant = product.variants.find((v: any) => v.sku === addData.sku);
        if (!variant) throw new BadRequestError('Selected variant is not available for this product');

        if (!variant.isAvailable) throw new BadRequestError('Selected variant is not available');
        
        if (variant.stock < addData.quantity) {
            throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested: ${addData.quantity}`);
        }

        let cart = await this._cartRepository.getCartBySessionId(sessionId);
        if (!cart) {
            cart = await this._cartRepository.createGuestCart(sessionId);
        }

        const existingItem = cart.items.find(i => 
            i.product.toString() === productId && 
            i.karat === addData.karat &&
            i.sku === addData.sku
        );

        if (existingItem) {
            const totalQuantity = existingItem.quantity + addData.quantity;
            if (variant.stock < totalQuantity) {
                throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested total: ${totalQuantity}`);
            }
            
            return this._cartRepository.updateCartItemBySessionId(
                sessionId, 
                existingItem._id.toString(), 
                { quantity: totalQuantity }
            );
        } else {
            return this._cartRepository.addItemToCartBySessionId(sessionId, {
                product: productId,
                quantity: addData.quantity,
                karat: addData.karat as 9 | 14 | 18,
                sku: addData.sku,
                price: addData.price,
                selectedImage: addData.selectedImage
            });
        }
    }

    async updateGuestCartItemById(sessionId: string, itemId: string, updateData: UpdateCartItemInput) {
        const cart = await this._cartRepository.getCartBySessionId(sessionId);
        if (!cart) throw new NotFoundError('Guest cart not found');
        
        const item = cart.items.find(i => i._id.toString() === itemId);
        if (!item) throw new NotFoundError('Item not found in guest cart');
        
        const product = await productService.getProductById(item.product.toString());
        if (!product || !product.isActive) throw new NotFoundError('Product not found or inactive');
        
        const targetSku = updateData.sku || item.sku;
        
        const variant = product.variants.find((v: any) => v.sku === targetSku);
        if (!variant) throw new BadRequestError('Selected variant is not available for this product');

        if (!variant.isAvailable) throw new BadRequestError('Selected variant is not available');
        
        if (variant.stock < (updateData.quantity || item.quantity)) {
            throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}, requested: ${updateData.quantity || item.quantity}`);
        }
        
        return this._cartRepository.updateCartItemBySessionId(sessionId, itemId, updateData);
    }

    async removeGuestCartItemByProduct(sessionId: string, productId: string, karat: number, sku: string) {
        const cart = await this._cartRepository.getCartBySessionId(sessionId);
        if (!cart) throw new NotFoundError('Guest cart not found');
        
        const item = cart.items.find(i => 
            i.product.toString() === productId && 
            i.karat === karat &&
            i.sku === sku
        );
        
        if (!item) {
            throw new NotFoundError('Item not found in guest cart');
        }
        
        return this._cartRepository.removeItemFromCartBySessionId(sessionId, item._id.toString());
    }

    async mergeGuestCartOnLogin(userId: string, sessionId: string) {
        const [userCart, guestCart] = await Promise.all([
            this._cartRepository.getCartByUserId(userId),
            this._cartRepository.getCartBySessionId(sessionId)
        ]);
        
        if (!guestCart || !guestCart.items.length) {
            return userCart || await this._cartRepository.createCart(userId);
        }
        
        let finalUserCart = userCart;
        if (!finalUserCart) {
            finalUserCart = await this._cartRepository.createCart(userId);
        }
        
        const mergedItems = new Map<string, any>();
        const getItemKey = (item: any) => `${item.product.toString()}_${item.karat}_${item.sku}`;
        
        for (const item of finalUserCart.items) {
            const key = getItemKey(item);
            mergedItems.set(key, {
                product: item.product.toString(),
                quantity: item.quantity,
                karat: item.karat,
                sku: item.sku,
                price: item.price,
                selectedImage: item.selectedImage
            });
        }
        
        for (const guestItem of guestCart.items) {
            const key = getItemKey(guestItem);
            
            try {
                const product = await productService.getProductById(guestItem.product.toString());
                if (!product || !product.isActive) continue;
                
                const variant = product.variants.find((v: any) => v.sku === guestItem.sku);
                if (!variant || !variant.isAvailable) continue;

                if (variant.stock === 0) continue;
                
                if (mergedItems.has(key)) {
                    const existingItem = mergedItems.get(key);
                    const totalQuantity = existingItem.quantity + guestItem.quantity;
                    const maxQuantity = Math.min(totalQuantity, variant.stock);
                    
                    mergedItems.set(key, {
                        ...existingItem,
                        quantity: maxQuantity,
                        price: variant.price
                    });
                } else {
                    const maxQuantity = Math.min(guestItem.quantity, variant.stock);
                    if (maxQuantity > 0) {
                        mergedItems.set(key, {
                            product: guestItem.product.toString(),
                            quantity: maxQuantity,
                            karat: guestItem.karat,
                            sku: guestItem.sku,
                            price: variant.price,
                            selectedImage: guestItem.selectedImage
                        });
                    }
                }
            } catch (error) {
                console.warn(`Skipping invalid guest cart item: ${guestItem.product}`, error);
            }
        }
        
        const mergedCartItems = Array.from(mergedItems.values());
        const updatedCart = await this._cartRepository.replaceCartItems(userId, mergedCartItems);
        
        await this._cartRepository.deleteGuestCart(sessionId);
        
        return updatedCart;
    }

    async removeDiscount(userId: string, { type }: { type: 'coupon' | 'voucher' | 'all' }) {
        const cart = await this.getCart(userId);
        
        if (!cart.items.length) {
            throw new BadRequestError('Cart is empty');
        }
        
        if (type === 'coupon' && !cart.appliedCoupon) {
            throw new NotFoundError('No coupon discount applied to cart');
        }
        
        if (type === 'voucher' && !cart.appliedVoucher) {
            throw new NotFoundError('No voucher discount applied to cart');
        }
        
        if (type === 'all' && !cart.appliedCoupon && !cart.appliedVoucher) {
            throw new NotFoundError('No discounts applied to cart');
        }
        
        return this._cartRepository.removeDiscount(userId, type);
    }

    async removeVoucher(userId: string) {
        const cart = await this.getCart(userId);

        if (!cart.appliedVoucher) {
            throw new NotFoundError('No voucher applied to cart');
        }

        const updatedCart = await this._cartRepository.clearVoucher(userId);

        if (!updatedCart) {
            throw new InternalServerError('Failed to remove voucher from cart');
        }

        return updatedCart;
    }

    async applyGiftCard(userId: string, { code, amount }: ApplyGiftCardInput) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) throw new BadRequestError('Cart is empty');

        const totals = await this.calculateCartTotal(cart);
        const currentTotal = totals.total;

        if (amount > currentTotal) {
            throw new BadRequestError(`Gift card amount (${amount}) cannot exceed cart total (${currentTotal})`);
        }

        const giftCard = await giftcardService.validateGiftCardForRedemption(code, amount);

        const updatedCart = await this._cartRepository.applyGiftCard(userId, {
            code,
            giftCardId: giftCard._id,
            redeemedAmount: amount
        });

        if (!updatedCart) {
            throw new InternalServerError('Failed to apply gift card to cart');
        }

        return updatedCart;
    }

    async removeGiftCard(userId: string) {
        const cart = await this.getCart(userId);

        if (!cart.appliedGiftCard) {
            throw new NotFoundError('No gift card applied to cart');
        }

        const updatedCart = await this._cartRepository.clearGiftCard(userId);

        if (!updatedCart) {
            throw new InternalServerError('Failed to remove gift card from cart');
        }

        return updatedCart;
    }
}

export default new CartService(new CartRepository());