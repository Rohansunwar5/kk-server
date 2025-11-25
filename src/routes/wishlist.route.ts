import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { 
    addItemToWishlist, 
    checkItemInWishlist, 
    clearWishlist, 
    createWishlist, 
    getWishlist, 
    getWishlistItemCount, 
    removeItemFromWishlist, 
    toggleWishlistItem, 
    updateItemPrice, 
    updateWishlist,
    moveItemToCart,
    getPublicWishlists,
    updateWishlistItem,
    getItemsWithPriceDrops,
    getItemsByVariant,
    syncWishlistPrices
} from "../controllers/wishlist.controller";

const wishlistRouter = Router();

// ============================================================================
// WISHLIST MANAGEMENT
// ============================================================================
wishlistRouter.post('/create', isLoggedIn, asyncHandler(createWishlist));
wishlistRouter.get('/', isLoggedIn, asyncHandler(getWishlist));
wishlistRouter.get('/count', isLoggedIn, asyncHandler(getWishlistItemCount));
wishlistRouter.get('/public', asyncHandler(getPublicWishlists));
wishlistRouter.put('/update', isLoggedIn, asyncHandler(updateWishlist));
wishlistRouter.delete('/clear', isLoggedIn, asyncHandler(clearWishlist));

// ============================================================================
// WISHLIST ITEMS MANAGEMENT (with variant support)
// ============================================================================
wishlistRouter.post('/add', isLoggedIn, asyncHandler(addItemToWishlist));
wishlistRouter.delete('/remove/:productId', isLoggedIn, asyncHandler(removeItemFromWishlist));
wishlistRouter.get('/check/:productId', isLoggedIn, asyncHandler(checkItemInWishlist));
wishlistRouter.post('/toggle', isLoggedIn, asyncHandler(toggleWishlistItem));

// ============================================================================
// ITEM UPDATES (NEW - variant and preferences)
// ============================================================================
wishlistRouter.put('/item/:productId', isLoggedIn, asyncHandler(updateWishlistItem));
wishlistRouter.put('/update-price/:productId', isLoggedIn, asyncHandler(updateItemPrice));

// ============================================================================
// MOVE TO CART (UPDATED for variants)
// ============================================================================
wishlistRouter.post('/move-to-cart/:productId', isLoggedIn, asyncHandler(moveItemToCart));

// ============================================================================
// PRICE TRACKING (NEW)
// ============================================================================
wishlistRouter.get('/price-drops', isLoggedIn, asyncHandler(getItemsWithPriceDrops));
wishlistRouter.post('/sync-prices', isLoggedIn, asyncHandler(syncWishlistPrices));

// ============================================================================
// FILTER BY VARIANT (NEW)
// ============================================================================
wishlistRouter.get('/by-variant', isLoggedIn, asyncHandler(getItemsByVariant));

export default wishlistRouter;