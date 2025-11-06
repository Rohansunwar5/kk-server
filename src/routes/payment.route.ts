import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';
import {
  initiatePayment,
  handleSuccessfulPayment,
  handleFailedPayment,
  getPaymentDetails,
  getPaymentByOrderId,
  getPaymentByOrderNumber,
  getPaymentHistory,
  initiateRefund,
  processRefund,
  getPaymentStats,
  getPaymentsByMethod,
  getPaymentsByStatus,
  getPaymentsByDateRange,
  getPaymentMethodStats,
  getRefundStats,
  verifyPayment,
  confirmCODPayment,
  getPendingCODPayments,
  getPaymentDetailsAdmin,
  getPaymentByOrderIdAdmin
} from '../controllers/payment.controller';

const paymentRouter = Router();

// ============================================================================
// USER ROUTES - Payment Operations
// ============================================================================

// Initiate payment for an order
paymentRouter.post('/initiate', isLoggedIn, asyncHandler(initiatePayment));

// Handle Razorpay payment callbacks
paymentRouter.post('/success', asyncHandler(handleSuccessfulPayment));
paymentRouter.post('/failure', asyncHandler(handleFailedPayment));
paymentRouter.post('/verify', asyncHandler(verifyPayment));

// Get payment details
paymentRouter.get('/details/:paymentId', isLoggedIn, asyncHandler(getPaymentDetails));
paymentRouter.get('/order/:orderId', isLoggedIn, asyncHandler(getPaymentByOrderId));
paymentRouter.get('/order-number/:orderNumber', isLoggedIn, asyncHandler(getPaymentByOrderNumber));

// Payment history
paymentRouter.get('/history', isLoggedIn, asyncHandler(getPaymentHistory));

// User payment stats
paymentRouter.get('/stats/my-stats', isLoggedIn, asyncHandler(getPaymentStats));

// ============================================================================
// ADMIN ROUTES - Payment Management
// ============================================================================

// Payment details (admin - no user verification)
paymentRouter.get('/admin/details/:paymentId', isAdminLoggedIn, asyncHandler(getPaymentDetailsAdmin));
paymentRouter.get('/admin/order/:orderId', isAdminLoggedIn, asyncHandler(getPaymentByOrderIdAdmin));

// Filter payments
paymentRouter.get('/admin/by-method/:method', isAdminLoggedIn, asyncHandler(getPaymentsByMethod));
paymentRouter.get('/admin/by-status/:status', isAdminLoggedIn, asyncHandler(getPaymentsByStatus));
paymentRouter.get('/admin/by-date-range', isAdminLoggedIn, asyncHandler(getPaymentsByDateRange));

// Statistics
paymentRouter.get('/admin/stats', isAdminLoggedIn, asyncHandler(getPaymentStats));
paymentRouter.get('/admin/stats/by-method', isAdminLoggedIn, asyncHandler(getPaymentMethodStats));
paymentRouter.get('/admin/stats/refunds', isAdminLoggedIn, asyncHandler(getRefundStats));

// ============================================================================
// ADMIN ROUTES - Refund Management
// ============================================================================

paymentRouter.post('/admin/refund/initiate', isAdminLoggedIn, asyncHandler(initiateRefund));
paymentRouter.patch('/admin/refund/process', isAdminLoggedIn, asyncHandler(processRefund));

// ============================================================================
// ADMIN ROUTES - COD Payment Management
// ============================================================================

// Confirm COD payment (when delivery executive collects payment)
paymentRouter.post('/admin/cod/confirm', isAdminLoggedIn, asyncHandler(confirmCODPayment));

// Get pending COD payments
paymentRouter.get('/admin/cod/pending', isAdminLoggedIn, asyncHandler(getPendingCODPayments));

export default paymentRouter;