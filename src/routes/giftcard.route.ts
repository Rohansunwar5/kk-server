import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
    purchaseGiftCard,
    getGiftCardById,
    getGiftCardByCode,
    getMyPurchasedGiftCards,
    getMyReceivedGiftCards,
    getAllGiftCards,
    updateGiftCard,
    activateGiftCard,
    checkGiftCardBalance,
    validateGiftCard,
    redeemGiftCard,
    cancelGiftCard,
    getGiftCardUsageHistory,
    getExpiredGiftCards,
    markExpiredGiftCards,
    deleteGiftCard
} from '../controllers/giftcard.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const giftCardRouter = Router();

// ============ USER ROUTES (Authenticated) ============

// POST /giftcards/purchase - Purchase a gift card
// Body: { amount, occasion, recipientName, recipientEmail, recipientPhone?, message?, imageUrl?, validityMonths?, purchaseOrderId }
giftCardRouter.post('/purchase', isLoggedIn, asyncHandler(purchaseGiftCard));

// GET /giftcards/my-purchased - Get all gift cards purchased by current user
giftCardRouter.get('/my-purchased', isLoggedIn, asyncHandler(getMyPurchasedGiftCards));

// GET /giftcards/my-received - Get all gift cards received by current user
giftCardRouter.get('/my-received', isLoggedIn, asyncHandler(getMyReceivedGiftCards));

// GET /giftcards/balance/:code - Check gift card balance
giftCardRouter.get('/balance/:code', asyncHandler(checkGiftCardBalance));

// POST /giftcards/validate - Validate gift card for redemption
// Body: { code, amount }
giftCardRouter.post('/validate', asyncHandler(validateGiftCard));

// POST /giftcards/redeem - Redeem gift card during checkout
// Body: { code, amount, orderId }
giftCardRouter.post('/redeem', isLoggedIn, asyncHandler(redeemGiftCard));

// DELETE /giftcards/:id/cancel - Cancel a gift card (only sender can cancel pending cards)
giftCardRouter.delete('/:id/cancel', isLoggedIn, asyncHandler(cancelGiftCard));

// GET /giftcards/code/:code - Get gift card details by code
giftCardRouter.get('/code/:code', asyncHandler(getGiftCardByCode));

// GET /giftcards/:id - Get gift card by ID
giftCardRouter.get('/:id', asyncHandler(getGiftCardById));

// ============ ADMIN ROUTES (Admin Only) ============

// GET /giftcards - Get all gift cards with filters
// Query: ?page=1&limit=10&status=active&senderId=xxx&recipientEmail=xxx&searchTerm=xxx
giftCardRouter.get('/', isAdminLoggedIn, asyncHandler(getAllGiftCards));

// PUT /giftcards/:id - Update gift card details
// Body: { recipientName?, recipientEmail?, recipientPhone?, message?, imageUrl?, validUpto?, status?, isActive? }
giftCardRouter.put('/:id', isAdminLoggedIn, asyncHandler(updateGiftCard));

// POST /giftcards/:id/activate - Activate a pending gift card
giftCardRouter.post('/:id/activate', isAdminLoggedIn, asyncHandler(activateGiftCard));

// GET /giftcards/:code/history - Get gift card usage history
giftCardRouter.get('/:code/history', isAdminLoggedIn, asyncHandler(getGiftCardUsageHistory));

// GET /giftcards/admin/expired - Get expired gift cards
// Query: ?page=1&limit=10
giftCardRouter.get('/admin/expired', isAdminLoggedIn, asyncHandler(getExpiredGiftCards));

// POST /giftcards/admin/mark-expired - Mark expired gift cards as expired
giftCardRouter.post('/admin/mark-expired', isAdminLoggedIn, asyncHandler(markExpiredGiftCards));

// DELETE /giftcards/:id - Hard delete gift card (only if not used)
giftCardRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteGiftCard));

export default giftCardRouter;