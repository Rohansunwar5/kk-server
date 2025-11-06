import { Request, Response, NextFunction } from "express";
import paymentService from "../services/payment.service";
import { IPaymentMethod, IPaymentStatus } from "../models/payment.model";
import { BadRequestError } from "../errors/bad-request.error";

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId, method, notes } = req.body;
  const user = req.user._id;

  if (!orderId || !method) {
    throw new BadRequestError('Order ID and payment method are required');
  }

  if (!Object.values(IPaymentMethod).includes(method)) {
    throw new BadRequestError('Invalid payment method');
  }
  
  const response = await paymentService.initiatePayment({ 
    orderId, 
    method: method as IPaymentMethod, 
    notes, 
    user 
  });
  
  next(response);
};

export const handleSuccessfulPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log('Payment success request:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? 'present' : 'missing'
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment parameters'
      });
    }

    const result = await paymentService.handleSuccessfulPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
};

export const handleFailedPayment = async (req: Request, res: Response, next: NextFunction) => {
  const { razorpayOrderId, razorpayPaymentId, failureReason } = req.body;

  if (!razorpayOrderId) {
    throw new BadRequestError('Razorpay order ID is required');
  }

  const response = await paymentService.handleFailedPayment(
    razorpayOrderId, 
    razorpayPaymentId, 
    failureReason
  );
  
  next(response);
};

export const getPaymentDetails = async (req: Request, res: Response, next: NextFunction) => {
  const { paymentId } = req.params;
  const user = req.user._id;
  const response = await paymentService.getPaymentDetails(paymentId, user);
  
  next(response);
};

export const getPaymentByOrderId = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const user = req.user._id;
  const response = await paymentService.getPaymentByOrderId(orderId, user);
  
  next(response);
};

export const getPaymentByOrderNumber = async (req: Request, res: Response, next: NextFunction) => {
  const { orderNumber } = req.params;
  const user = req.user._id;
  const response = await paymentService.getPaymentByOrderNumber(orderNumber, user);
  
  next(response);
};

export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user._id;
  const { page = 1, limit = 10 } = req.query;
  
  const response = await paymentService.getPaymentHistory(
    user, 
    Number(page), 
    Number(limit)
  );
  
  next(response);
};

export const initiateRefund = async (req: Request, res: Response, next: NextFunction) => {
  const { paymentId, amount, reason } = req.body;

  if (!paymentId || !amount) {
    throw new BadRequestError('Payment ID and refund amount are required');
  }

  if (amount <= 0) {
    throw new BadRequestError('Refund amount must be greater than 0');
  }
  
  const response = await paymentService.initiateRefund({
    paymentId,
    amount,
    reason
  });
  
  next(response);
};

export const processRefund = async (req: Request, res: Response, next: NextFunction) => {
  const { paymentId, refundId, status, razorpayRefundId } = req.body;

  if (!paymentId || !refundId || !status) {
    throw new BadRequestError('Payment ID, refund ID, and status are required');
  }

  if (!['pending', 'processed', 'failed'].includes(status)) {
    throw new BadRequestError('Invalid refund status');
  }
  
  const response = await paymentService.processRefund({
    paymentId,
    refundId,
    status,
    razorpayRefundId
  });
  
  next(response);
};

export const getPaymentStats = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query;
  const response = await paymentService.getPaymentStats(userId as string);
  
  next(response);
};

export const getPaymentsByMethod = async (req: Request, res: Response, next: NextFunction) => {
  const { method } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!Object.values(IPaymentMethod).includes(method as IPaymentMethod)) {
    throw new BadRequestError('Invalid payment method');
  }
  
  const response = await paymentService.getPaymentsByMethod(
    method as IPaymentMethod, 
    Number(page), 
    Number(limit)
  );
  
  next(response);
};

export const getPaymentsByStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { status } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!Object.values(IPaymentStatus).includes(status as IPaymentStatus)) {
    throw new BadRequestError('Invalid payment status');
  }
  
  const response = await paymentService.getPaymentsByStatus(
    status as IPaymentStatus, 
    Number(page), 
    Number(limit)
  );
  
  next(response);
};

export const getPaymentsByDateRange = async (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate, page = 1, limit = 10 } = req.query;
  
  if (!startDate || !endDate) {
    throw new BadRequestError('Start date and end date are required');
  }
  
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadRequestError('Invalid date format');
  }
  
  if (start >= end) {
    throw new BadRequestError('Start date must be before end date');
  }
  
  const response = await paymentService.getPaymentsByDateRange(
    start, 
    end, 
    Number(page), 
    Number(limit)
  );
  
  next(response);
};

export const getPaymentMethodStats = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query;
  const response = await paymentService.getPaymentMethodStats(userId as string);
  
  next(response);
};

export const getRefundStats = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query;
  const response = await paymentService.getRefundStats(userId as string);
  
  next(response);
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment parameters'
      });
    }

    const result = await paymentService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

// NEW: COD payment confirmation
export const confirmCODPayment = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId, collectedAmount, notes } = req.body;

  if (!orderId || !collectedAmount) {
    throw new BadRequestError('Order ID and collected amount are required');
  }

  if (collectedAmount <= 0) {
    throw new BadRequestError('Collected amount must be greater than 0');
  }

  const response = await paymentService.confirmCODPayment(orderId, collectedAmount, notes);
  
  next(response);
};

// NEW: Get pending COD payments
export const getPendingCODPayments = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10 } = req.query;
  
  const response = await paymentService.getPendingCODPayments(Number(page), Number(limit));
  
  next(response);
};

// NEW: Admin - Get payment details (no user verification)
export const getPaymentDetailsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { paymentId } = req.params;
  const response = await paymentService.getPaymentDetails(paymentId);
  
  next(response);
};

// NEW: Admin - Get payment by order ID (no user verification)
export const getPaymentByOrderIdAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const response = await paymentService.getPaymentByOrderId(orderId);
  
  next(response);
};