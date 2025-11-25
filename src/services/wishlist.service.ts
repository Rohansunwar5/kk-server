import mongoose from "mongoose";
import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { 
    AddWishlistItemParams, 
    CreateWishlistParams, 
    UpdateWishlistParams, 
    UpdateWishlistItemParams,
    WishlistRepository 
} from "../repository/wishlist.repository";
import cartService from "./cart.service";
import productService from "./product.service";

interface GetWishlistsParams {
    page: number;
    limit: number;
}

interface MoveToCartParams {
    userId: string;
    productId: string;
    karat: 9 | 14 | 18;
    sku: string;
    selectedImage: string;
    quantity?: number;
    // Optional customizations
    selectedColor?: {
        name: string;
        hexCode?: string;
    };
    selectedSize?: string;
}

class WishlistService {
    constructor(private _wishlistRepository: WishlistRepository) {}
    
    async createWishlist(params: CreateWishlistParams) {
        const existingWishlist = await this._wishlistRepository.getWishlistByUserId(params.user);
        if (existingWishlist) throw new BadRequestError('User already has a wishlist');

        const wishlist = await this._wishlistRepository.createWishlist(params);
        if (!wishlist) throw new InternalServerError('Failed to create wishlist');

        return wishlist;
    }

    async getWishlistByUserId(userId: string) {
        if (!userId) throw new BadRequestError('User ID is required');

        let wishlist = await this._wishlistRepository.getWishlistByUserId(userId);
        
        if (!wishlist) {
            wishlist = await this._wishlistRepository.createWishlist({
                user: userId,
                name: "My Wishlist",
                isPublic: false
            });
        }

        return wishlist;
    }

    /**
     * Add item to wishlist with variant information
     */
    async addItemToWishlist(params: AddWishlistItemParams) {
        const { userId, productId, priceWhenAdded, selectedVariant, preferences } = params;

        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        // Verify product exists
        const product = await productService.getProductById(productId);
        if (!product) {
            throw new NotFoundError('Product not found');
        }

        // If variant info provided, verify it exists
        if (selectedVariant?.sku) {
            const variant = product.variants.find(v => v.sku === selectedVariant.sku);
            if (!variant) {
                throw new NotFoundError(`Variant with SKU ${selectedVariant.sku} not found`);
            }

            // Use variant price if not provided
            if (!selectedVariant.priceWhenAdded) {
                selectedVariant.priceWhenAdded = variant.price;
            }
        }

        const updatedWishlist = await this._wishlistRepository.addItemToWishlist(params);
        
        if (!updatedWishlist) throw new InternalServerError('Failed to add item to wishlist');

        return updatedWishlist;
    }

    async removeItemFromWishlist(userId: string, productId: string) {
        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (!itemExists) {
            throw new NotFoundError('Product not found in wishlist');
        }

        const updatedWishlist = await this._wishlistRepository.removeItemFromWishlist(userId, productId);
        if (!updatedWishlist) throw new InternalServerError('Failed to remove item from wishlist');

        return updatedWishlist;
    }

    async updateWishlist(userId: string, params: UpdateWishlistParams) {
        if (!userId) throw new BadRequestError('User ID is required');

        const existingWishlist = await this._wishlistRepository.getWishlistByUserId(userId);
        if (!existingWishlist) throw new NotFoundError('Wishlist not found');

        const updatedWishlist = await this._wishlistRepository.updateWishlist(userId, params);
        if (!updatedWishlist) throw new InternalServerError('Failed to update wishlist');

        return updatedWishlist;
    }

    async clearWishlist(userId: string) {
        if (!userId) throw new BadRequestError('User Id is required');

        const existingWishlist = await this._wishlistRepository.getWishlistByUserId(userId);

        if (!existingWishlist) throw new NotFoundError('Wishlist not found');

        if (existingWishlist.items.length === 0) {
            throw new BadRequestError('Wishlist is already empty');
        }

        const clearedWishlist = await this._wishlistRepository.clearWishlist(userId);

        if (!clearedWishlist) throw new InternalServerError('Failed to clear wishlist');

        return clearedWishlist;
    }

    async getPublicWishlists(params: GetWishlistsParams) {
        const { page, limit } = params;
        return this._wishlistRepository.getPublicWishlists(page, limit);
    }

    async getWishlistItemCount(userId: string) {
        if (!userId) throw new BadRequestError('User Id is required');

        return this._wishlistRepository.getWishlistItemCount(userId);
    }

    async checkItemInWishlist(userId: string, productId: string) {
        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const exists = await this._wishlistRepository.checkItemExists(userId, productId);
        return { exists };
    }

    async toggleWishlistItem(
        userId: string, 
        productId: string, 
        priceWhenAdded?: number,
        selectedVariant?: any,
        preferences?: any
    ) {
        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);

        if (itemExists) {
            await this.removeItemFromWishlist(userId, productId);
            return { action: 'removed', message: 'Item removed from wishlist' };
        } else {
            await this.addItemToWishlist({ 
                userId, 
                productId, 
                priceWhenAdded,
                selectedVariant,
                preferences
            });
            return { action: 'added', message: 'Item added to wishlist' };
        }
    }

    async updateItemPrice(userId: string, productId: string, newPrice: number) {
        if (!userId || !productId || newPrice === undefined) {
            throw new BadRequestError('User ID, Product ID, and new price are required');
        }

        if (newPrice < 0) {
            throw new BadRequestError('Price cannot be negative');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (!itemExists) {
            throw new NotFoundError('Product not found in wishlist');
        }

        const updatedWishlist = await this._wishlistRepository.updateItemPrice(userId, productId, newPrice);
        if (!updatedWishlist) throw new InternalServerError('Failed to update item price');

        return updatedWishlist;
    }

    /**
     * Move item from wishlist to cart (UPDATED for variants)
     */
    async moveItemToCart(params: MoveToCartParams) {
        const { 
            userId, 
            productId, 
            karat, 
            sku, 
            selectedImage, 
            quantity = 1,
            selectedColor,
            selectedSize
        } = params;

        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        if (!karat || !sku) {
            throw new BadRequestError('Karat and SKU are required');
        }

        if (!selectedImage) {
            throw new BadRequestError('Selected image is required');
        }

        if (quantity <= 0) {
            throw new BadRequestError('Quantity must be greater than 0');
        }

        // Verify item exists in wishlist
        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (!itemExists) {
            throw new NotFoundError('Product not found in wishlist');
        }

        // Verify product and variant exist
        const product = await productService.getProductById(productId);
        if (!product) {
            throw new NotFoundError('Product not found');
        }

        const variant = product.variants.find(v => v.sku === sku && v.karat === karat);
        if (!variant) {
            throw new NotFoundError(`Variant with SKU ${sku} and ${karat}K not found`);
        }

        if (!variant.isAvailable) {
            throw new BadRequestError('This variant is currently not available');
        }

        if (variant.stock < quantity) {
            throw new BadRequestError(
                `Insufficient stock. Available: ${variant.stock}, Requested: ${quantity}`
            );
        }

        // Add to cart with variant information
        await cartService.addItemToCart(userId, {
            product: productId,
            quantity,
            karat,
            sku,
            price: variant.price,
            selectedImage
        });

        // Remove from wishlist
        const updatedWishlist = await this._wishlistRepository.removeItemFromWishlist(userId, productId);
        if (!updatedWishlist) throw new InternalServerError('Failed to remove item from wishlist');

        return {
            message: 'Item moved to cart successfully',
            wishlist: updatedWishlist
        };
    }

    /**
     * Update wishlist item (variant, preferences, etc.)
     */
    async updateWishlistItem(params: UpdateWishlistItemParams) {
        const { userId, productId } = params;

        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (!itemExists) {
            throw new NotFoundError('Product not found in wishlist');
        }

        const updatedWishlist = await this._wishlistRepository.updateWishlistItem(params);
        if (!updatedWishlist) throw new InternalServerError('Failed to update wishlist item');

        return updatedWishlist;
    }

    /**
     * Get items with price drops
     */
    async getItemsWithPriceDrops(userId: string) {
        if (!userId) throw new BadRequestError('User ID is required');

        return this._wishlistRepository.getItemsWithPriceDrops(userId);
    }

    /**
     * Get items by variant (karat, stone type)
     */
    async getItemsByVariant(userId: string, karat?: number, stoneType?: string) {
        if (!userId) throw new BadRequestError('User ID is required');

        if (karat && ![9, 14, 18].includes(karat)) {
            throw new BadRequestError('Invalid karat. Must be 9, 14, or 18');
        }

        const validStoneTypes = ['regular_diamond', 'gemstone', 'colored_diamond'];
        if (stoneType && !validStoneTypes.includes(stoneType)) {
            throw new BadRequestError('Invalid stone type');
        }

        return this._wishlistRepository.getItemsByVariant(userId, karat, stoneType);
    }

    /**
     * Sync wishlist prices with current product prices
     */
    async syncWishlistPrices(userId: string) {
        if (!userId) throw new BadRequestError('User ID is required');

        const wishlist = await this._wishlistRepository.getWishlistByUserId(userId);
        if (!wishlist) throw new NotFoundError('Wishlist not found');

        const updates: Promise<any>[] = [];

        for (const item of wishlist.items) {
            try {
                const product = await productService.getProductById(item.product.toString());
                if (!product) continue;

                // If item has variant info, get that variant's current price
                if (item.selectedVariant?.sku) {
                    const variant = product.variants.find(v => v.sku === item.selectedVariant?.sku);
                    if (variant) {
                        updates.push(
                            this._wishlistRepository.updateWishlistItem({
                                userId,
                                productId: item.product.toString(),
                                currentPrice: variant.price,
                                priceDropAlert: item.priceWhenAdded 
                                    ? variant.price < item.priceWhenAdded 
                                    : false
                            })
                        );
                    }
                }
            } catch (error) {
                console.error(`Failed to sync price for product ${item.product}:`, error);
            }
        }

        await Promise.all(updates);

        return this._wishlistRepository.getWishlistByUserId(userId);
    }
}

export default new WishlistService(new WishlistRepository());