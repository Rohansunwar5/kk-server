import { Request, Response, NextFunction } from "express";
import wishlistService from "../services/wishlist.service";
import { BadRequestError } from "../errors/bad-request.error";

export const createWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { name, isPublic } = req.body;

    const response = await wishlistService.createWishlist({
        user: userId,
        name,
        isPublic
    });

    next(response);
};

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const response = await wishlistService.getWishlistByUserId(userId);

    next(response);
};

export const addItemToWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { 
        productId, 
        priceWhenAdded,
        selectedVariant,
        preferences
    } = req.body;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    // Validate variant if provided
    if (selectedVariant) {
        if (selectedVariant.karat && ![9, 14, 18].includes(selectedVariant.karat)) {
            throw new BadRequestError('Invalid karat. Must be 9, 14, or 18');
        }

        const validStoneTypes = ['regular_diamond', 'gemstone', 'colored_diamond'];
        if (selectedVariant.stoneType && !validStoneTypes.includes(selectedVariant.stoneType)) {
            throw new BadRequestError('Invalid stone type');
        }
    }

    const response = await wishlistService.addItemToWishlist({
        userId,
        productId,
        priceWhenAdded,
        selectedVariant,
        preferences
    });

    next(response);
};

export const removeItemFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    const response = await wishlistService.removeItemFromWishlist(userId, productId);

    next(response);
};

export const updateWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { name, isPublic } = req.body;

    const response = await wishlistService.updateWishlist(userId, { name, isPublic });

    next(response);
};

export const clearWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const response = await wishlistService.clearWishlist(userId);

    next(response);
};

export const getWishlistItemCount = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const count = await wishlistService.getWishlistItemCount(userId);

    next({ count });
};

export const checkItemInWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    const response = await wishlistService.checkItemInWishlist(userId, productId);

    next(response);
};

export const toggleWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { 
        productId, 
        priceWhenAdded,
        selectedVariant,
        preferences
    } = req.body;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    const response = await wishlistService.toggleWishlistItem(
        userId, 
        productId, 
        priceWhenAdded,
        selectedVariant,
        preferences
    );

    next(response);
};

export const updateItemPrice = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { productId } = req.params;
    const { price } = req.body;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    if (price === undefined) {
        throw new BadRequestError('Price is required');
    }

    const response = await wishlistService.updateItemPrice(userId, productId, price);

    next(response);
};

/**
 * Move item from wishlist to cart (UPDATED for variants)
 */
export const moveItemToCart = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { productId } = req.params;
    const { 
        karat, 
        sku, 
        selectedImage, 
        quantity,
        selectedColor,
        selectedSize
    } = req.body;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    if (!karat || !sku) {
        throw new BadRequestError('Karat and SKU are required');
    }

    if (![9, 14, 18].includes(karat)) {
        throw new BadRequestError('Invalid karat. Must be 9, 14, or 18');
    }

    if (!selectedImage) {
        throw new BadRequestError('Selected image is required');
    }

    const response = await wishlistService.moveItemToCart({
        userId,
        productId,
        karat,
        sku,
        selectedImage,
        quantity,
        selectedColor,
        selectedSize
    });

    next(response);
};

export const getPublicWishlists = async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1) {
        throw new BadRequestError('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
        throw new BadRequestError('Limit must be between 1 and 100');
    }

    const response = await wishlistService.getPublicWishlists({ page, limit });

    next(response);
};

// NEW: Update wishlist item
export const updateWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { productId } = req.params;
    const { selectedVariant, preferences, currentPrice, priceDropAlert } = req.body;

    if (!productId) {
        throw new BadRequestError('Product ID is required');
    }

    const response = await wishlistService.updateWishlistItem({
        userId,
        productId,
        selectedVariant,
        preferences,
        currentPrice,
        priceDropAlert
    });

    next(response);
};

// NEW: Get items with price drops
export const getItemsWithPriceDrops = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const response = await wishlistService.getItemsWithPriceDrops(userId);

    next(response);
};

// NEW: Get items by variant
export const getItemsByVariant = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { karat, stoneType } = req.query;

    const karatNum = karat ? parseInt(karat as string) : undefined;

    const response = await wishlistService.getItemsByVariant(
        userId, 
        karatNum, 
        stoneType as string
    );

    next(response);
};

// NEW: Sync wishlist prices
export const syncWishlistPrices = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const response = await wishlistService.syncWishlistPrices(userId);

    next(response);
};