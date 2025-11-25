import wishlistModel, { IWishlist, IWishlistItem, IWishlistItemVariant, IWishlistItemPreferences } from "../models/wishlist.model";

export interface CreateWishlistParams {
    user: string;
    name?: string;
    isPublic?: boolean;
}

export interface AddWishlistItemParams {
    userId: string;
    productId: string;
    priceWhenAdded?: number;
    // NEW: Variant information
    selectedVariant?: {
        karat?: 9 | 14 | 18;
        sku?: string;
        stoneType?: 'regular_diamond' | 'gemstone' | 'colored_diamond';
        priceWhenAdded?: number;
    };
    // NEW: Optional preferences
    preferences?: {
        selectedColor?: {
            name: string;
            hexCode?: string;
        };
        selectedSize?: string;
        selectedImage?: string;
    };
}

export interface UpdateWishlistParams {
    name?: string;
    isPublic?: boolean;
}

export interface UpdateWishlistItemParams {
    userId: string;
    productId: string;
    selectedVariant?: IWishlistItemVariant;
    preferences?: IWishlistItemPreferences;
    currentPrice?: number;
    priceDropAlert?: boolean;
}

export class WishlistRepository {
    private _model = wishlistModel;

    async createWishlist(params: CreateWishlistParams) {
        return this._model.create({
            user: params.user,
            name: params.name || 'My wishlist',
            isPublic: params.isPublic || false,
            items: []
        });
    }

    async getWishlistByUserId(userId: string) {
        return this._model.findOne({ user: userId });
    }

    async getWishlistById(wishlistId: string) {
        return this._model.findById(wishlistId);
    }

    async addItemToWishlist(params: AddWishlistItemParams) {
        // Check if product already exists (regardless of variant)
        const existingWishlist = await this._model.findOne({
            user: params.userId,
            "items.product": params.productId
        });

        if (existingWishlist) {
            // If item exists, optionally update variant info
            if (params.selectedVariant) {
                return this._model.findOneAndUpdate(
                    {
                        user: params.userId,
                        "items.product": params.productId
                    },
                    {
                        $set: {
                            "items.$.selectedVariant": params.selectedVariant,
                            "items.$.preferences": params.preferences,
                            "items.$.addedAt": new Date()
                        }
                    },
                    { new: true }
                );
            }
            return existingWishlist;
        }

        const newItem: any = {
            product: params.productId,
            priceWhenAdded: params.priceWhenAdded,
            addedAt: new Date()
        };

        if (params.selectedVariant) {
            newItem.selectedVariant = params.selectedVariant;
        }

        if (params.preferences) {
            newItem.preferences = params.preferences;
        }

        return this._model.findOneAndUpdate(
            { user: params.userId },
            { $push: { items: newItem } },
            { new: true, upsert: true }
        );
    }

    async removeItemFromWishlist(userId: string, productId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId } } },
            { new: true }
        );
    }

    async updateWishlist(userId: string, params: UpdateWishlistParams) {
        return this._model.findOneAndUpdate(
            { user: userId },
            params,
            { new: true, runValidators: true }
        );
    }

    async clearWishlist(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );
    }

    async checkItemExists(userId: string, productId: string) {
        const wishlist = await this._model.findOne({
            user: userId,
            "items.product": productId
        });

        return !!wishlist;
    }

    async getPublicWishlists(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const wishlists = await this._model.find({ isPublic: true })
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 });
        const total = await this._model.countDocuments({ isPublic: true });
        
        return {
            wishlists,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    async getWishlistItemCount(userId: string): Promise<number> {
        const wishlist = await this._model.findOne({ user: userId }).select('items');
        return wishlist ? wishlist.items.length : 0;
    }

    async updateItemPrice(userId: string, productId: string, newPrice: number): Promise<IWishlist | null> {
        return this._model.findOneAndUpdate(
            { 
                user: userId,
                "items.product": productId 
            },
            { 
                $set: { 
                    "items.$.priceWhenAdded": newPrice,
                    "items.$.currentPrice": newPrice
                } 
            },
            { new: true }
        );
    }

    async getWishlistWithProducts(userId: string) {
        return this._model.findOne({ user: userId });
    }

    async getWishlistItem(userId: string, productId: string): Promise<IWishlistItem | null> {
        const wishlist = await this._model.findOne({
            user: userId,
            "items.product": productId
        });
        
        if (wishlist) {
            const item = wishlist.items.find(item => item.product.toString() === productId);
            return item || null;
        }
        
        return null;
    }

    // NEW: Update wishlist item (variant, preferences, price)
    async updateWishlistItem(params: UpdateWishlistItemParams) {
        const updateFields: any = {};

        if (params.selectedVariant) {
            updateFields["items.$.selectedVariant"] = params.selectedVariant;
        }

        if (params.preferences) {
            updateFields["items.$.preferences"] = params.preferences;
        }

        if (params.currentPrice !== undefined) {
            updateFields["items.$.currentPrice"] = params.currentPrice;
        }

        if (params.priceDropAlert !== undefined) {
            updateFields["items.$.priceDropAlert"] = params.priceDropAlert;
        }

        return this._model.findOneAndUpdate(
            {
                user: params.userId,
                "items.product": params.productId
            },
            { $set: updateFields },
            { new: true }
        );
    }

    // NEW: Get items with price drops
    async getItemsWithPriceDrops(userId: string) {
        const wishlist = await this._model.findOne({ user: userId });
        
        if (!wishlist) return [];

        return wishlist.items.filter(item => 
            item.priceWhenAdded && 
            item.currentPrice && 
            item.currentPrice < item.priceWhenAdded &&
            item.priceDropAlert
        );
    }

    // NEW: Get items by variant
    async getItemsByVariant(userId: string, karat?: number, stoneType?: string) {
        const wishlist = await this._model.findOne({ user: userId });
        
        if (!wishlist) return [];

        return wishlist.items.filter(item => {
            if (!item.selectedVariant) return false;
            
            let matches = true;
            if (karat && item.selectedVariant.karat !== karat) matches = false;
            if (stoneType && item.selectedVariant.stoneType !== stoneType) matches = false;
            
            return matches;
        });
    }
}