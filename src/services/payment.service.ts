import config from "../config";
import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { IOrderStatus } from "../models/order.model";
import { IPaymentMethod, IPaymentStatus } from "../models/payment.model";
import { OrderRepository } from "../repository/order.repository";
import { PaymentRepository } from "../repository/payment.repository";
import { UserRepository } from "../repository/user.repository";
import cartService from "./cart.service";
import mailService from "./mail.service";
import orderService from "./order.service";
import productService from "./product.service";
import razorpayService from "./razorpay.service";

export interface InitiatePaymentParams {
  orderId: string;
  user: string;
  method: IPaymentMethod;
  notes?: any;
}

export interface RefundPaymentParams {
  paymentId: string;
  amount: number;
  reason?: string;
  razorpayRefundId?: string;
}

export interface ProcessRefundParams {
  paymentId: string;
  refundId: string;
  status: 'pending' | 'processed' | 'failed';
  razorpayRefundId?: string;
}

interface RazorpayPaymentResponse {
  id: string;
  order_id: string;
  status: string;
  amount: number | string;
  currency: string;
  method: string;
  captured: boolean;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  created_at: number;
}

export interface PaymentResult {
  payment: any;
  order?: any;
}

class PaymentService {
    constructor(
        private readonly _paymentRepository: PaymentRepository, 
        private readonly _userRepository: UserRepository, 
        private readonly _orderRepository: OrderRepository
    ) {}

    /**
     * Initiate payment for an order (supports new variant-based orders)
     */
    async initiatePayment(params: InitiatePaymentParams) {
        const { orderId, user, method, notes } = params;

        // Get order (now supports variant structure)
        const order = await orderService.getOrderById(orderId);
        if (!order) throw new NotFoundError('Order not found');

        if (order.user.toString() !== user) {
            throw new BadRequestError('Order does not belong to user');
        }

        // Check if payment already exists
        const existingPayment = await this._paymentRepository.getPaymentByOrderId(orderId);
        if (existingPayment && existingPayment.status === IPaymentStatus.CAPTURED) {
            throw new BadRequestError('Payment already completed for this order');
        }

        // Handle COD payment
        if (method === IPaymentMethod.COD) {
            const payment = await this._paymentRepository.createPayment({
                orderId,
                orderNumber: order.orderNumber,
                user,
                amount: order.total,
                currency: 'INR',
                method: IPaymentMethod.COD,
                notes: {
                    ...notes,
                    // Include variant information for tracking
                    variants: order.items.map(item => ({
                        productId: item.productId,
                        sku: item.sku,
                        karat: item.karat,
                        stoneType: item.stoneType,
                        quantity: item.quantity
                    }))
                }
            });

            // COD is marked as captured immediately but will be confirmed on delivery
            // Update order status to processing
            await orderService.updateOrderStatus(orderId, IOrderStatus.PROCESSING);

            return { payment };
        }

        // Handle Razorpay payment
        const amountInPaise = Math.round(order.total * 100);

        const razorpayOrder = await razorpayService.createOrder(
            orderId,
            amountInPaise, 
            'INR',
            { 
                ...notes, 
                orderId, 
                userId: user,
                // Include variant information in Razorpay notes
                variants: order.items.map(item => ({
                    productId: item.productId,
                    sku: item.sku,
                    karat: item.karat,
                    stoneType: item.stoneType
                }))
            }
        );

        // Create or update payment record
        let payment;
        if (existingPayment) {
            payment = await this._paymentRepository.updatePayment(existingPayment._id.toString(), {
                razorpayOrderId: razorpayOrder.id,
                notes: { ...notes, razorpayOrder }
            });
        } else {
            payment = await this._paymentRepository.createPayment({
                orderId,
                orderNumber: order.orderNumber,
                user,
                amount: order.total,
                currency: 'INR',
                method: IPaymentMethod.RAZORPAY,
                receipt: razorpayOrder.receipt,
                notes: { ...notes, razorpayOrder }
            });

            await this._paymentRepository.updatePayment(payment._id.toString(), {
                razorpayOrderId: razorpayOrder.id
            });
        }

        return { 
          payment,
          order: razorpayOrder,
          key: config.RAZORPAY_KEY_ID
        };
    }

    /**
     * Handle successful payment (updated for variant-based orders)
     */
    async handleSuccessfulPayment(
        razorpayOrderId: string, 
        razorpayPaymentId: string,
        razorpaySignature: string
    ) {
        try {
            // 1. Get stored payment record
            const payment = await this._paymentRepository.getPaymentByRazorpayOrderId(razorpayOrderId);
            if (!payment) {
                throw new NotFoundError('Payment not found');
            }

            // 2. Verify signature using razorpayService
            const isValidSignature = await razorpayService.verifyPaymentSignature(
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            );

            if (!isValidSignature) {
                throw new BadRequestError('Invalid payment signature');
            }

            // 3. Fetch payment details from Razorpay using razorpayService
            const razorpayPayment = await razorpayService.fetchPayment(razorpayPaymentId);

            // 4. Verify payment status
            if (razorpayPayment.status !== 'captured') {
                throw new BadRequestError(`Payment not captured. Status: ${razorpayPayment.status}`);
            }

            // 5. Verify payment amount (both should be in paise)
            const paymentAmount = Number(payment.amount);
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new BadRequestError('Invalid payment amount in stored payment record');
            }
            const expectedAmountInPaise = Math.round(paymentAmount * 100);
            const receivedAmountInPaise = razorpayPayment.amount;

            if (receivedAmountInPaise !== expectedAmountInPaise) {
                throw new BadRequestError(
                    `Payment amount mismatch. Expected ${expectedAmountInPaise} paise (₹${payment.amount}), ` +
                    `received ${receivedAmountInPaise} paise (₹${Number(receivedAmountInPaise) / 100})`
                );
            }

            // 6. Update payment record
            const updatedPayment = await this._paymentRepository.markPaymentAsCaptured(
                payment._id.toString(),
                razorpayPaymentId,
                {
                    ...payment.notes,
                    razorpayPayment: {
                        id: razorpayPayment.id,
                        status: razorpayPayment.status,
                        method: razorpayPayment.method,
                        bank: razorpayPayment.bank,
                        wallet: razorpayPayment.wallet,
                        vpa: razorpayPayment.vpa,
                        captured: razorpayPayment.captured,
                        amount: razorpayPayment.amount,
                        currency: razorpayPayment.currency,
                        created_at: new Date(razorpayPayment.created_at * 1000)
                    }
                }
            );

            // 7. Update order status
            await orderService.updateOrderStatus(
                payment.orderId.toString(),
                IOrderStatus.PROCESSING
            );

            // 8. Get order details
            const orderDetails = await this._orderRepository.getOrderById(
                payment.orderId.toString()
            );
            if (!orderDetails) throw new InternalServerError('Order not found');

            // 9. Handle stock reduction for VARIANTS (NEW)
            try {
                const orderItems = orderDetails.items.map(item => ({
                    productId: item.product.toString(),
                    sku: item.sku,
                    karat: item.karat,
                    quantity: item.quantity
                }));

                if (orderItems.length > 0) {
                    await productService.reduceStockForOrder(orderItems);
                }
            } catch (stockError: any) {
                console.error('CRITICAL: Payment confirmed but stock reduction failed:', {
                    razorpayOrderId,
                    razorpayPaymentId,
                    orderId: payment.orderId.toString(),
                    error: stockError.message,
                    timestamp: new Date().toISOString()
                });
                // Don't throw error - payment is already captured
                // Log for manual stock adjustment
            }

            // 10. Get user details
            const user = await this._userRepository.getUserById(
                payment.user.toString()
            );
            if (!user) throw new NotFoundError('User not found');

            // 11. Prepare email data with VARIANT information (NEW)
            const emailData = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                orderNumber: orderDetails.orderNumber,
                orderDate: new Date(orderDetails.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                paymentDetails: {
                    method: razorpayPayment.method,
                    amount: orderDetails.total,
                    transactionId: razorpayPaymentId
                },
                items: orderDetails.items.map(item => ({
                    productName: item.productName,
                    productId: item.productId,
                    sku: item.sku,
                    karat: item.karat,
                    stoneType: item.stoneType,
                    quantity: item.quantity,
                    // Optional customizations
                    size: item.selectedSize?.toUpperCase() || 'N/A',
                    color: item.selectedColor?.name || 'Default',
                    priceAtPurchase: item.priceAtPurchase,
                    grossWeight: item.grossWeight,
                    itemTotal: item.itemTotal
                })),
                pricing: {
                    subtotal: orderDetails.subtotal,
                    totalDiscountAmount: orderDetails.totalDiscountAmount || 0,
                    shippingCharge: orderDetails.shippingCharge,
                    taxAmount: orderDetails.taxAmount,
                    total: orderDetails.total
                }
            };

            // 12. Send confirmation email
            await mailService.sendEmail(
                user.email,
                'order-confirmation-email.ejs',
                emailData,
                `Order Confirmation - ${orderDetails.orderNumber}`
            );

            // 13. Clear cart
            await cartService.clearCartItems(payment.user.toString());

            return updatedPayment;
        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }

    /**
     * Handle failed payment
     */
    async handleFailedPayment(razorpayOrderId: string, razorpayPaymentId: string, failureReason?: string) {
      const payment = await this._paymentRepository.getPaymentByRazorpayOrderId(razorpayOrderId);
      if (!payment) throw new NotFoundError('Payment not found');

      // Update payment status
      const updatedPayment = await this._paymentRepository.markPaymentAsFailed(
          payment._id.toString(),
          failureReason
      );

      // Update razorpay payment ID if provided
      if (razorpayPaymentId) {
          await this._paymentRepository.updatePayment(payment._id.toString(), {
              razorpayPaymentId
          });
      }

      // Update order status
      await orderService.updateOrderStatus(payment.orderId.toString(), IOrderStatus.FAILED);

      return updatedPayment;
    }

    /**
     * Initiate refund
     */
    async initiateRefund(params: RefundPaymentParams) {
      const { paymentId, amount, reason, razorpayRefundId } = params;
      
      const payment = await this._paymentRepository.getPaymentById(paymentId);
      if (!payment) throw new NotFoundError('Payment not found');

      if (payment.status !== IPaymentStatus.CAPTURED) {
          throw new BadRequestError('Only captured payments can be refunded');
      }

      if (amount <= 0 || amount > payment.amount) {
          throw new BadRequestError('Invalid refund amount');
      }

      // Add refund record
      const updatedPayment = await this._paymentRepository.addRefund({
          paymentId,
          amount,
          reason,
          razorpayRefundId,
          status: 'pending'
      });

      return updatedPayment;
    }

    /**
     * Process refund
     */
    async processRefund(params: ProcessRefundParams) {
        const { paymentId, refundId, status, razorpayRefundId } = params;
        
        const updatedPayment = await this._paymentRepository.updateRefundStatus({
            paymentId,
            refundId,
            status,
            processedAt: status === 'processed' ? new Date() : undefined
        });

        return updatedPayment;
    }

    /**
     * Confirm COD payment (NEW - for delivery confirmation)
     */
    async confirmCODPayment(orderId: string, collectedAmount: number, notes?: any) {
        const payment = await this._paymentRepository.getPaymentByOrderId(orderId);
        if (!payment) {
            throw new NotFoundError('Payment record not found');
        }

        if (payment.method !== IPaymentMethod.COD) {
            throw new BadRequestError('This is not a COD payment');
        }

        if (payment.status === IPaymentStatus.CAPTURED) {
            throw new BadRequestError('COD payment already confirmed');
        }

        // Verify collected amount matches
        if (collectedAmount !== payment.amount) {
            console.warn(
                `COD amount mismatch. Expected: ${payment.amount}, Collected: ${collectedAmount}`
            );
        }

        // Mark as captured
        const updatedPayment = await this._paymentRepository.markPaymentAsCaptured(
            payment._id.toString(),
            undefined,
            { collectedAmount, confirmedAt: new Date(), ...notes }
        );

        return updatedPayment;
    }

    /**
     * Get pending COD payments (NEW)
     */
    async getPendingCODPayments(page: number = 1, limit: number = 10) {
        return this._paymentRepository.getPaymentsByMethod(IPaymentMethod.COD, page, limit);
    }

    async getPaymentDetails(paymentId: string, userId?: string) {
        const payment = await this._paymentRepository.getPaymentById(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        if (userId && payment.user.toString() !== userId) {
            throw new BadRequestError('Payment does not belong to user');
        }

        return payment;
    }

    async getPaymentByOrderId(orderId: string, userId?: string) {
        const payment = await this._paymentRepository.getPaymentByOrderId(orderId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        if (userId && payment.user.toString() !== userId) {
            throw new BadRequestError('Payment does not belong to user');
        }

        return payment;
    }

    async getPaymentByOrderNumber(orderNumber: string, userId?: string) {
        const payment = await this._paymentRepository.getPaymentByOrderNumber(orderNumber);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        if (userId && payment.user.toString() !== userId) {
            throw new BadRequestError('Payment does not belong to user');
        }

        return payment;
    }

    async getPaymentHistory(userId: string, page: number = 1, limit: number = 10) {
        return this._paymentRepository.getPaymentsByUser(userId, page, limit);
    }

    async getPaymentStats(userId?: string) {
        const stats = await this._paymentRepository.getPaymentStats(userId);
        return stats[0] || {
            totalPayments: 0,
            totalAmount: 0,
            successfulPayments: 0,
            failedPayments: 0,
            refundedPayments: 0,
            partialRefundedPayments: 0,
            successfulAmount: 0,
            refundedAmount: 0
        };
    }

    async getPaymentsByMethod(method: IPaymentMethod, page: number = 1, limit: number = 10) {
        return this._paymentRepository.getPaymentsByMethod(method, page, limit);
    }

    async getPaymentsByStatus(status: IPaymentStatus, page: number = 1, limit: number = 10) {
        return this._paymentRepository.getPaymentsByStatus(status, page, limit);
    }

    async getPaymentsByDateRange(startDate: Date, endDate: Date, page: number = 1, limit: number = 10) {
        return this._paymentRepository.getPaymentsByDateRange(startDate, endDate, page, limit);
    }

    async getPaymentMethodStats(userId?: string) {
        return this._paymentRepository.getPaymentsByMethodStats(userId);
    }

    async getRefundStats(userId?: string) {
        return this._paymentRepository.getRefundStats(userId);
    }

    async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
        try {
            // Verify signature using razorpayService
            const isValid = await razorpayService.verifyPaymentSignature(
                razorpayOrderId, 
                razorpayPaymentId, 
                razorpaySignature
            );

            if (!isValid) {
                throw new BadRequestError('Invalid payment signature');
            }

            // Fetch payment details from Razorpay
            const razorpayPayment = await razorpayService.fetchPayment(razorpayPaymentId);
            
            // Process successful payment
            return await this.handleSuccessfulPayment(
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            );
        } catch (error) {
            console.error('Payment verification error:', error);
            throw error;
        }
    }
}

export default new PaymentService(new PaymentRepository(), new UserRepository(), new OrderRepository());