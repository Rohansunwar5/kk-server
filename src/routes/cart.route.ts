import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  addItemToCart,
  addItemToGuestCart,
  addItemToGuestCartByProduct,
  applyDiscount,
  applyGiftCard,
  applyVoucher,
  clearCartItems,
  deleteCart,
  getCart,
  getCartWithDetails,
  getGuestCart,
  getGuestCartWithDetails,
  mergeGuestCartOnLogin,
  removeCartItemByProduct,
  removeDiscount,
  removeGiftCard,
  removeGuestCartItemByProduct,
  removeVoucher,
  updateCartItemByProduct,
  updateGuestCartItemByProduct,
  validateCart,
  validateDiscountForUser,
} from '../controllers/cart.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const cartRouter = Router();

// ============ USER CART ROUTES (Authenticated) ============

// GET /cart - Get user's cart
cartRouter.get('/', isLoggedIn, asyncHandler(getCart));

// GET /cart/details - Get cart with full product details and totals
cartRouter.get('/details', isLoggedIn, asyncHandler(getCartWithDetails));

// POST /cart - Add item to cart
// Body: { product, quantity, karat, sku, price, selectedImage }
cartRouter.post('/', isLoggedIn, asyncHandler(addItemToCart));

// PUT /cart/item/:itemId - Update cart item by item ID
// Body: { quantity?, karat?, sku?, price?, selectedImage? }
cartRouter.put('/item/:itemId', isLoggedIn, asyncHandler(updateCartItemByProduct));

// DELETE /cart/product/:productId?karat=14&sku=RING001-14K - Remove specific variant from cart
cartRouter.delete('/product/:productId', isLoggedIn, asyncHandler(removeCartItemByProduct));

// POST /cart/apply-discount - Apply coupon or voucher
// Body: { code, type: 'coupon' | 'voucher' }
cartRouter.post('/apply-discount', isLoggedIn, asyncHandler(applyDiscount));

// POST /cart/apply-giftcard - Apply gift card
// Body: { code, amount }
cartRouter.post('/apply-giftcard', isLoggedIn, asyncHandler(applyGiftCard));

// DELETE /cart/remove-discount - Remove discount
// Body: { type: 'coupon' | 'voucher' | 'all' }
cartRouter.delete('/remove-discount', isLoggedIn, asyncHandler(removeDiscount));

// DELETE /cart/remove-giftcard - Remove gift card
cartRouter.delete('/remove-giftcard', isLoggedIn, asyncHandler(removeGiftCard));

cartRouter.post('/apply-voucher', isLoggedIn, asyncHandler(applyVoucher));
cartRouter.delete('/remove-voucher', isLoggedIn, asyncHandler(removeVoucher));


// POST /cart/validate-discount - Check if user can use a discount
// Body: { code }
cartRouter.post('/validate-discount', isLoggedIn, asyncHandler(validateDiscountForUser));

// DELETE /cart/clear - Clear all items from cart
cartRouter.delete('/clear', isLoggedIn, asyncHandler(clearCartItems));

// DELETE /cart - Delete entire cart
cartRouter.delete('/', isLoggedIn, asyncHandler(deleteCart));

// POST /cart/validate - Validate cart items availability and stock
cartRouter.post('/validate', isLoggedIn, asyncHandler(validateCart));

// ============ GUEST CART ROUTES (No Authentication) ============

// GET /cart/guest/:sessionId/details - Get guest cart with full details
cartRouter.get('/guest/:sessionId/details', asyncHandler(getGuestCartWithDetails));

// GET /cart/guest/:sessionId - Get guest cart
cartRouter.get('/guest/:sessionId', asyncHandler(getGuestCart));

// POST /cart/guest/:sessionId - Add item to guest cart
// Body: { product, quantity, karat, sku, price, selectedImage }
cartRouter.post('/guest/:sessionId', asyncHandler(addItemToGuestCart));

// POST /cart/guest/:sessionId/product/:productId - Add specific product variant to guest cart
// Body: { quantity, karat, sku, price, selectedImage }
cartRouter.post('/guest/:sessionId/product/:productId', asyncHandler(addItemToGuestCartByProduct));

// PUT /cart/guest/:sessionId/item/:itemId - Update guest cart item by item ID
// Body: { quantity?, karat?, sku?, price?, selectedImage? }
cartRouter.put('/guest/:sessionId/item/:itemId', asyncHandler(updateGuestCartItemByProduct));

// DELETE /cart/guest/:sessionId/product/:productId?karat=14&sku=RING001-14K - Remove variant from guest cart
cartRouter.delete('/guest/:sessionId/product/:productId', asyncHandler(removeGuestCartItemByProduct));

// POST /cart/guest/validate?sessionId=xyz - Validate guest cart items
cartRouter.post('/guest/validate', asyncHandler(validateCart));

// ============ CART MERGE (On Login) ============

// POST /cart/merge - Merge guest cart into user cart upon login
// Body: { sessionId }
cartRouter.post('/merge', isLoggedIn, asyncHandler(mergeGuestCartOnLogin));

export default cartRouter;