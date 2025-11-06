import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
    createVoucher,
    updateVoucher,
    getVoucherById,
    getVoucherByCode,
    getAvailableVouchers,
    getAllVouchers,
    applyVoucher,
    markVoucherAsUsed,
    deleteVoucher,
    getExpiredVouchers,
    getVoucherStats
} from '../controllers/voucher.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const voucherRouter = Router();

// Admin routes
voucherRouter.post('/', isAdminLoggedIn, asyncHandler(createVoucher));
voucherRouter.put('/:id', isAdminLoggedIn, asyncHandler(updateVoucher));
voucherRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteVoucher));
voucherRouter.get('/all', isAdminLoggedIn, asyncHandler(getAllVouchers));
voucherRouter.get('/expired', isAdminLoggedIn, asyncHandler(getExpiredVouchers));
voucherRouter.get('/stats', isAdminLoggedIn, asyncHandler(getVoucherStats));

// User routes (authenticated)
voucherRouter.post('/mark-used', isLoggedIn, asyncHandler(markVoucherAsUsed));

// Public routes
voucherRouter.get('/available', asyncHandler(getAvailableVouchers));
voucherRouter.get('/:id', asyncHandler(getVoucherById));
voucherRouter.get('/code/:code', asyncHandler(getVoucherByCode));
voucherRouter.post('/apply', asyncHandler(applyVoucher));

export default voucherRouter;