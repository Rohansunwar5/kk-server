import { NextFunction, Request, Response } from "express";
import orderService from "../services/order.service";
import { BadRequestError } from "../errors/bad-request.error";
import { IOrderStatus } from "../models/order.model";

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;
  
  const response = await orderService.createOrder({
    userId,
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes
  });

  next(response);
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?._id;
  
  const order = await orderService.getOrderById(id);
  
  // Verify order belongs to user (for non-admin routes)
  if (order.user.toString() !== userId?.toString()) {
    throw new BadRequestError('Order not found or access denied');
  }
  
  next(order);
};

export const getOrderByIdAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await orderService.getOrderById(id);
  next(response);
};

export const getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  let status: IOrderStatus | undefined = undefined;
  const statusQuery = req.query.status as string;
  if (statusQuery && Object.values(IOrderStatus).includes(statusQuery as IOrderStatus)) {
    status = statusQuery as IOrderStatus;
  }

  const response = await orderService.getUserOrders(userId.toString(), page, limit, status);

  next(response);
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?._id;
  const { reason } = req.body;
  
  if (!reason || !reason.trim()) {
    throw new BadRequestError('Cancellation reason is required');
  }
  
  const response = await orderService.cancelOrder(id, reason, userId);

  next(response);
};

export const returnOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?._id;
  const { reason } = req.body;
  
  if (!reason || !reason.trim()) {
    throw new BadRequestError('Return reason is required');
  }
  
  const response = await orderService.returnOrder(id, reason, userId);

  next(response);
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const response = await orderService.updateOrderStatus(id, status);

  next(response);
};

export const searchOrders = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { q } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (!q) throw new BadRequestError('Search query is required');
  
  const response = await orderService.searchOrders(q as string, userId?.toString(), page, limit);

  next(response);
};

export const getOrderStats = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const response = await orderService.getOrderStats(userId?.toString());

  next(response);
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as IOrderStatus | undefined;
  const sortBy = req.query.sortBy as string || '-createdAt';
  
  let startDate: Date | undefined = undefined;
  let endDate: Date | undefined = undefined;
  
  if (req.query.startDate) {
    startDate = new Date(req.query.startDate as string);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestError('Invalid start date format');
    }
  }
  
  if (req.query.endDate) {
    endDate = new Date(req.query.endDate as string);
    if (isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid end date format');
    }
  }
  
  const searchTerm = req.query.search as string | undefined;
  
  const response = await orderService.getAllOrders({
    page,
    limit,
    status,
    sortBy,
    startDate,
    endDate,
    searchTerm
  });

  next(response);
};

// NEW: Get orders by karat
export const getOrdersByKarat = async (req: Request, res: Response, next: NextFunction) => {
  const { karat } = req.params;
  const karatNum = parseInt(karat);
  
  if (![9, 14, 18].includes(karatNum)) {
    throw new BadRequestError('Invalid karat. Must be 9, 14, or 18');
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const response = await orderService.getOrdersByKarat(karatNum, page, limit);
  
  next(response);
};

// NEW: Get orders by stone type
export const getOrdersByStoneType = async (req: Request, res: Response, next: NextFunction) => {
  const { stoneType } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const validStoneTypes = ['regular_diamond', 'gemstone', 'colored_diamond'];
  if (!validStoneTypes.includes(stoneType)) {
    throw new BadRequestError('Invalid stone type');
  }
  
  const response = await orderService.getOrdersByStoneType(stoneType, page, limit);
  
  next(response);
};

// UPDATED: Get orders by product and variant
export const getOrdersByProductAndVariant = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;
  const karat = req.query.karat ? parseInt(req.query.karat as string) : undefined;
  const stoneType = req.query.stoneType as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (!productId) {
    throw new BadRequestError('Product ID is required');
  }
  
  if (karat && ![9, 14, 18].includes(karat)) {
    throw new BadRequestError('Invalid karat. Must be 9, 14, or 18');
  }
  
  const response = await orderService.getOrdersByProductAndVariant(
    productId,
    karat,
    stoneType,
    page,
    limit
  );
  
  next(response);
};

// UPDATED: Get variant sales statistics
export const getVariantSalesStats = async (req: Request, res: Response, next: NextFunction) => {
  let startDate: Date | undefined = undefined;
  let endDate: Date | undefined = undefined;
  
  if (req.query.startDate) {
    startDate = new Date(req.query.startDate as string);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestError('Invalid start date format');
    }
  }
  
  if (req.query.endDate) {
    endDate = new Date(req.query.endDate as string);
    if (isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid end date format');
    }
  }
  
  const response = await orderService.getVariantSalesStats(startDate, endDate);
  
  next(response);
};

// UPDATED: Get top selling variants
export const getTopSellingVariants = async (req: Request, res: Response, next: NextFunction) => {
  const limit = parseInt(req.query.limit as string) || 10;
  
  let startDate: Date | undefined = undefined;
  let endDate: Date | undefined = undefined;
  
  if (req.query.startDate) {
    startDate = new Date(req.query.startDate as string);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestError('Invalid start date format');
    }
  }
  
  if (req.query.endDate) {
    endDate = new Date(req.query.endDate as string);
    if (isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid end date format');
    }
  }
  
  if (limit < 1 || limit > 100) {
    throw new BadRequestError('Limit must be between 1 and 100');
  }
  
  const response = await orderService.getTopSellingVariants(limit, startDate, endDate);
  
  next(response);
};

export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  
  const response = await orderService.updateOrder(id, { paymentStatus });
  
  next(response);
};

export const addTrackingNumber = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { trackingNumber } = req.body;
  
  const response = await orderService.updateOrder(id, { trackingNumber });
  
  next(response);
};