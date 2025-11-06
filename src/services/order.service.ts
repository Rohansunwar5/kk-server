import { BadRequestError } from "../errors/bad-request.error";
import { NotFoundError } from "../errors/not-found.error";
import { InternalServerError } from "../errors/internal-server.error";
import { CreateOrderParams, OrderRepository, UpdateOrderParams } from "../repository/order.repository";
import { IOrderStatus } from "../models/order.model";
import cartService from "./cart.service";
import productService from "./product.service";
import discountService from "./discount.service";
import voucherService from "./voucher.service";
import giftcardService from "./giftcard.service";

export interface GetAllOrdersOptions {
  page?: number;
  limit?: number;
  status?: IOrderStatus;
  sortBy?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

export interface CreateOrderInput {
  userId: string;
  shippingAddress: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    phone: string;
  };
  billingAddress: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    phone: string;
  };
  paymentMethod?: string;
  notes?: string;
}

export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  total: number;
  itemCount: number;
  status: string;
}

export interface VariantSalesStats {
  _id: {
    karat: number;
    stoneType: string;
  };
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

class OrderService {
  constructor(private readonly _orderRepository: OrderRepository) {}

  async createOrder(input: CreateOrderInput): Promise<OrderSummary> {
    const { userId, shippingAddress, billingAddress, paymentMethod, notes } = input;
    
    const cartDetails = await cartService.getCartWithDetails(userId);
    if (!cartDetails.items.length) throw new BadRequestError('Cart is empty');
    
    await this.validateStockAvailability(cartDetails.items);
    
    const orderNumber = await this.generateOrderNumber();
    
    const subtotal = cartDetails.totals.subtotal;
    const totalDiscountAmount = cartDetails.totals.discountAmount;
    const shippingCharge = this.calculateShippingCharge(subtotal);
    const taxAmount = this.calculateTax(subtotal - totalDiscountAmount + shippingCharge);
    const total = parseFloat((subtotal - totalDiscountAmount + shippingCharge + taxAmount).toFixed(2));
    
    const orderItems = await Promise.all(
      cartDetails.items.map(async (item) => {
        const product = await productService.getProductById(item.product._id);
        if (!product) throw new NotFoundError(`Product not found: ${item.product._id}`);
        
        const variant = product.variants.find(
          v => v.karat === item.karat && v.sku === item.sku
        );
        
        if (!variant) {
          throw new NotFoundError(`Variant not found for SKU: ${item.sku}`);
        }
        
        let selectedColor;
        let selectedSize;
        
        if (product.customizationOptions?.hasColorOptions) {
          const matchedColor = product.customizationOptions.colors.find(
            c => c.imageUrls?.some(img => img.url === item.selectedImage)
          );
          if (matchedColor) {
            selectedColor = {
              name: matchedColor.name,
              hexCode: matchedColor.hexCode
            };
          }
        }
        
        return {
          product: item.product._id,
          productName: product.name,
          productId: product.productId,
          productImage: item.selectedImage,
          quantity: item.quantity,
          karat: item.karat,
          stoneType: variant.stoneType,
          sku: item.sku,
          selectedColor,
          selectedSize, // Can be extended based on your cart implementation
          selectedImage: item.selectedImage,
          priceAtPurchase: item.price,
          grossWeight: variant.grossWeight,
          itemTotal: item.price * item.quantity
        };
      })
    );

    // ===== SAFE MARKING OF DISCOUNTS/VOUCHERS/GIFT CARDS =====
  // Handle coupon (discount code)
  if (cartDetails.cart.appliedCoupon?.code) {
    await this.safelyMarkDiscountAsUsed(
      cartDetails.cart.appliedCoupon.code, 
      userId
    );
  }

  // Handle voucher
  if (cartDetails.cart.appliedVoucher?.code) {
    await this.safelyMarkVoucherAsUsed(
      cartDetails.cart.appliedVoucher.code, 
      userId
    );
  }

  // Handle gift card
  if (cartDetails.cart.appliedGiftCard?.code) {
    await this.safelyMarkGiftCardAsUsed(
      cartDetails.cart.appliedGiftCard.code,
      userId,
      cartDetails.cart.appliedGiftCard.redeemedAmount || 0
    );
  }
    
    const orderParams: CreateOrderParams = {
      orderNumber,
      user: userId,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal,
      appliedCoupon: cartDetails.cart.appliedCoupon?.discountId ? {
        code: cartDetails.cart.appliedCoupon.code,
        discountId: String(cartDetails.cart.appliedCoupon.discountId),
        discountAmount: cartDetails.cart.appliedCoupon.discountAmount
      } : undefined,
      appliedVoucher: cartDetails.cart.appliedVoucher?.voucherId ? {
        code: cartDetails.cart.appliedVoucher.code,
        discountId: String(cartDetails.cart.appliedVoucher.voucherId),
        discountAmount: cartDetails.cart.appliedVoucher.discountAmount
      } : undefined,
      appliedGiftCard: cartDetails.cart.appliedGiftCard?.giftCardId ? {
        code: cartDetails.cart.appliedGiftCard.code,
        giftCardId: String(cartDetails.cart.appliedGiftCard.giftCardId),
        redeemedAmount: cartDetails.cart.appliedGiftCard.redeemedAmount
      } : undefined,
      totalDiscountAmount,
      shippingCharge,
      taxAmount,
      total,
      paymentMethod,
      notes
    };
    
    const order = await this._orderRepository.createOrder(orderParams);
    if (!order) throw new InternalServerError('Failed to create order');
      
    // Reserve stock for variants
    await this.reserveStock(cartDetails.items);
    
    // Clear cart
    await cartService.clearCartItems(userId);
    
    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      itemCount: order.items.length,
      status: order.status
    };
  }

  async getOrderById(orderId: string) {
    const order = await this._orderRepository.getOrderById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string) {
    const order = await this._orderRepository.getOrderByOrderNumber(orderNumber);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getUserOrders(userId: string, page: number = 1, limit: number = 10, status?: IOrderStatus) {
    return this._orderRepository.getOrdersByUser(userId, page, limit, status);
  }

  async updateOrderStatus(orderId: string, status: IOrderStatus) {
    const order = await this.getOrderById(orderId);
    this.validateStatusTransition(order.status, status);

    const updatedOrder = await this._orderRepository.updateOrderStatus(orderId, status);
    if (!updatedOrder) {
      throw new InternalServerError('Failed to update order status');
    }

    await this.handleStatusUpdate(updatedOrder, status);
    return updatedOrder;
  }

  async updateOrder(orderId: string, updateData: UpdateOrderParams) {
    await this.getOrderById(orderId);
    
    const updatedOrder = await this._orderRepository.updateOrder(orderId, updateData);
    if (!updatedOrder) {
      throw new InternalServerError('Failed to update order');
    }
    return updatedOrder;
  }

  async cancelOrder(orderId: string, reason: string, userId?: string) {
    const order = await this.getOrderById(orderId);
    
    if (userId && order.user.toString() !== userId) {
      throw new BadRequestError('Order does not belong to user');
    }

    if (!this.canCancelOrder(order.status)) {
      throw new BadRequestError(`Cannot cancel order with status: ${order.status}`);
    }

    const cancelledOrder = await this._orderRepository.cancelOrder(orderId, reason);
    if (!cancelledOrder) throw new InternalServerError('Failed to cancel order');

    // Restore stock for all variants
    await this.restoreStock(order.items);

    return cancelledOrder;
  }

  async returnOrder(orderId: string, reason: string, userId?: string) {
    const order = await this.getOrderById(orderId);
    
    if (userId && order.user.toString() !== userId) {
      throw new BadRequestError('Order does not belong to user');
    }

    if (order.status !== IOrderStatus.DELIVERED) {
      throw new BadRequestError('Only delivered orders can be returned');
    }

    const returnedOrder = await this._orderRepository.returnOrder(orderId, reason);
    if (!returnedOrder) {
      throw new InternalServerError('Failed to return order');
    }

    await this.restoreStock(order.items);
    return returnedOrder;
  }

  async searchOrders(searchTerm: string, userId?: string, page: number = 1, limit: number = 10) {
    return this._orderRepository.searchOrders(searchTerm, userId, page, limit);
  }

  async getOrderStats(userId?: string) {
    return this._orderRepository.getOrderStats(userId);
  }

  async getOrdersByKarat(karat: number, page: number = 1, limit: number = 10) {
    if (![9, 14, 18].includes(karat)) {
      throw new BadRequestError('Invalid karat value. Must be 9, 14, or 18');
    }
    return this._orderRepository.getOrdersByKarat(karat, page, limit);
  }

  async getOrdersByStoneType(stoneType: string, page: number = 1, limit: number = 10) {
    const validStoneTypes = ['regular_diamond', 'gemstone', 'colored_diamond'];
    if (!validStoneTypes.includes(stoneType)) {
      throw new BadRequestError('Invalid stone type');
    }
    return this._orderRepository.getOrdersByStoneType(stoneType, page, limit);
  }

  async getOrdersByProductAndVariant(
    productId: string, 
    karat?: number, 
    stoneType?: string,
    page: number = 1, 
    limit: number = 10
  ) {
    if (!productId) {
      throw new BadRequestError('Product ID is required');
    }

    const product = await productService.getProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this._orderRepository.getOrdersByProductAndVariant(
      productId,
      karat,
      stoneType,
      page,
      limit
    );
  }

  async getVariantSalesStats(startDate?: Date, endDate?: Date): Promise<VariantSalesStats[]> {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestError('Start date cannot be after end date');
    }
    return this._orderRepository.getVariantSalesStats(startDate, endDate);
  }

  async getTopSellingVariants(limit: number = 10, startDate?: Date, endDate?: Date) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    const variantStats = await this.getVariantSalesStats(startDate, endDate);
    return variantStats.slice(0, limit);
  }

  async getAllOrders(options: GetAllOrdersOptions = {}) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = '-createdAt',
      startDate,
      endDate,
      searchTerm
    } = options;

    if (page < 1) throw new BadRequestError('Page must be greater than 0');
    if (limit < 1 || limit > 100) throw new BadRequestError('Limit must be between 1 and 100');

    return this._orderRepository.getAllOrders({
      page,
      limit,
      status,
      sortBy,
      startDate,
      endDate,
      searchTerm
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
  }

  private calculateShippingCharge(subtotal: number): number {
    return 0; 
  }

  private calculateTax(taxableAmount: number): number {
    return 0;
  }

  private async validateStockAvailability(cartItems: any[]) {
    for (const item of cartItems) {
      const product = await productService.getProductById(item.product._id);
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.product.name || item.product._id}`);
      }

      // Find the variant by karat and SKU
      const variant = product.variants.find(
        v => v.karat === item.karat && v.sku === item.sku
      );

      if (!variant) {
        throw new NotFoundError(`Variant not found for SKU: ${item.sku}`);
      }

      if (!variant.isAvailable) {
        throw new BadRequestError(
          `Variant ${item.sku} is not available for ${product.name}`
        );
      }

      if (variant.stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for ${product.name} (SKU: ${item.sku}). Available: ${variant.stock}, Required: ${item.quantity}`
        );
      }
    }
  }

  private async reserveStock(cartItems: any[]) {
    const orderItems = cartItems.map(item => ({
      productId: item.product._id,
      sku: item.sku,
      karat: item.karat,
      quantity: item.quantity
    }));

    try {
      await productService.reduceStockForOrder(orderItems);
    } catch (error: any) {
      throw new BadRequestError(`Failed to reserve stock: ${error.message}`);
    }
  }

  private async restoreStock(orderItems: any[]) {
    const stockItems = orderItems.map(item => ({
      productId: item.product.toString(),
      sku: item.sku,
      karat: item.karat,
      quantity: item.quantity
    }));

    try {
      for (const item of stockItems) {
        await productService.updateProductStockByVariant({
          productId: item.productId,
          sku: item.sku,
          quantity: item.quantity 
        });
      }
    } catch (error) {
      console.error('Failed to restore stock:', error);
    }
  }

  private validateStatusTransition(currentStatus: IOrderStatus, newStatus: IOrderStatus) {
    const validTransitions: Record<IOrderStatus, IOrderStatus[]> = {
      [IOrderStatus.PENDING]: [IOrderStatus.PROCESSING, IOrderStatus.CANCELLED, IOrderStatus.FAILED],
      [IOrderStatus.PROCESSING]: [IOrderStatus.SHIPPED, IOrderStatus.CANCELLED],
      [IOrderStatus.SHIPPED]: [IOrderStatus.DELIVERED, IOrderStatus.CANCELLED],
      [IOrderStatus.DELIVERED]: [IOrderStatus.RETURNED],
      [IOrderStatus.CANCELLED]: [],
      [IOrderStatus.FAILED]: [IOrderStatus.PENDING],
      [IOrderStatus.RETURNED]: []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private canCancelOrder(status: IOrderStatus): boolean {
    return [IOrderStatus.PENDING, IOrderStatus.PROCESSING].includes(status);
  }

  private async safelyMarkDiscountAsUsed(code: string, userId: string) {
    try {
      // Check if discount exists
      const discount = await discountService.getDiscountByCode(code);
      if (discount) {
        await discountService.markDiscountAsUsed(code, userId);
      }
    } catch (error: any) {
      // If discount not found, it might be a voucher or gift card, so we ignore
      if (error.statusCode === 404 || error.message?.includes('not found')) {
        console.log(`Discount code ${code} not found, skipping...`);
        return;
      }
      // Re-throw other errors (like "already used", "expired", etc.)
      throw error;
    }
  }

  private async safelyMarkVoucherAsUsed(code: string, userId: string) {
    try {
      const voucher = await voucherService.getVoucherByCode(code);
      if (voucher) {
        await voucherService.markVoucherAsUsed(code, userId);
      }
    } catch (error: any) {
      if (error.statusCode === 404 || error.message?.includes('not found')) {
        console.log(`Voucher code ${code} not found, skipping...`);
        return;
      }
      throw error;
    }
  }

  private async safelyMarkGiftCardAsUsed(code: string, userId: string, amount: number) {
    try {
      const giftCard = await giftcardService.getGiftCardByCode(code);
    } catch (error: any) {
      if (error.statusCode === 404 || error.message?.includes('not found')) {
        console.log(`Gift card code ${code} not found, skipping...`);
        return;
      }
      throw error;
    }
  }

  private async handleStatusUpdate(order: any, newStatus: IOrderStatus) {
    switch (newStatus) {
      case IOrderStatus.PROCESSING:
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7); 
        await this._orderRepository.updateOrder(order._id, {
          estimatedDeliveryDate: estimatedDelivery
        });
        break;
      
      case IOrderStatus.SHIPPED:
        if (!order.trackingNumber) {
          const trackingNumber = `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`;
          await this._orderRepository.updateOrder(order._id, {
            trackingNumber
          });
        }
        break;
    }
  }
}

export default new OrderService(new OrderRepository());