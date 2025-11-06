import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  createDiscount,
  updateDiscount,
  getDiscountByCode,
  getAllDiscounts,
  getActiveDiscounts,
  getDiscountStats,
  getExpiredDiscounts,
  deleteDiscount
} from '../controllers/discount.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const discountRouter = Router();

// Admin routes
discountRouter.post('/',  asyncHandler(createDiscount));
discountRouter.put('/:id', asyncHandler(updateDiscount));
discountRouter.delete('/:id', asyncHandler(deleteDiscount));
discountRouter.get('/all', asyncHandler(getAllDiscounts));
discountRouter.get('/expired', asyncHandler(getExpiredDiscounts));
discountRouter.get('/:id/stats', asyncHandler(getDiscountStats));

// Public/User routes
discountRouter.get('/active', asyncHandler(getActiveDiscounts));
discountRouter.get('/code/:code', asyncHandler(getDiscountByCode));
// discountRouter.post('/apply', isLoggedIn, asyncHandler(applyDiscountToCart));


export default discountRouter;