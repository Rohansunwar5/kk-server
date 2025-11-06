import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import {  
  getAllOrders, 
  getOrderByIdAdmin, 
  getOrderById,
  getOrderStats, 
  getUserOrders, 
  searchOrders, 
  updateOrderStatus,
  createOrder,
  cancelOrder,
  returnOrder,
  getOrdersByKarat,
  getOrdersByStoneType,
  getOrdersByProductAndVariant,
  getVariantSalesStats,
  getTopSellingVariants,
  updatePaymentStatus,
  addTrackingNumber
} from "../controllers/order.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";

const orderRouter = Router();

// User routes
orderRouter.post('/', isLoggedIn, asyncHandler(createOrder));
orderRouter.get('/', isLoggedIn, asyncHandler(getUserOrders));
orderRouter.get('/search', isLoggedIn, asyncHandler(searchOrders));
orderRouter.get('/stats', isLoggedIn, asyncHandler(getOrderStats));
orderRouter.get('/:id', isLoggedIn, asyncHandler(getOrderById));
orderRouter.post('/:id/cancel', isLoggedIn, asyncHandler(cancelOrder));
orderRouter.post('/:id/return', isLoggedIn, asyncHandler(returnOrder));

// Admin routes - Order management
orderRouter.get('/admin/all', isAdminLoggedIn, asyncHandler(getAllOrders));
orderRouter.get('/admin/order/:id', isAdminLoggedIn, asyncHandler(getOrderByIdAdmin));
orderRouter.patch('/admin/:id/status', isAdminLoggedIn, asyncHandler(updateOrderStatus));
orderRouter.patch('/admin/:id/payment-status', isAdminLoggedIn, asyncHandler(updatePaymentStatus));
orderRouter.patch('/admin/:id/tracking', isAdminLoggedIn, asyncHandler(addTrackingNumber));

// Admin routes - Analytics and reporting (UPDATED)
orderRouter.get('/admin/analytics/variant-sales', isAdminLoggedIn, asyncHandler(getVariantSalesStats));
orderRouter.get('/admin/analytics/top-variants', isAdminLoggedIn, asyncHandler(getTopSellingVariants));

// Admin routes - Variant-based filtering (NEW/UPDATED)
orderRouter.get('/admin/by-karat/:karat', isAdminLoggedIn, asyncHandler(getOrdersByKarat));
orderRouter.get('/admin/by-stone-type/:stoneType', isAdminLoggedIn, asyncHandler(getOrdersByStoneType));
orderRouter.get('/admin/by-product/:productId', isAdminLoggedIn, asyncHandler(getOrdersByProductAndVariant));

export default orderRouter;