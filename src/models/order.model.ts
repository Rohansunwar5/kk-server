import mongoose from 'mongoose';
import { IPaymentMethod, IPaymentStatus } from './payment.model';

export enum IOrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  RETURNED = 'returned'
}

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  productId: {
    type: String,
    required: true,
  },
  productImage: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  // NEW: Variant information
  karat: {
    type: Number,
    enum: [9, 14, 18],
    required: true,
  },
  stoneType: {
    type: String,
    enum: ['regular_diamond', 'gemstone', 'colored_diamond'],
    default: 'regular_diamond',
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  // NEW: Optional customization selections
  selectedColor: {
    name: {
      type: String,
      trim: true,
    },
    hexCode: {
      type: String,
      trim: true,
    }
  },
  selectedSize: {
    type: String,
    enum: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
  },
  selectedImage: {
    type: String,
    required: true,
  },
  priceAtPurchase: {
    type: Number,
    required: true,
    min: 0,
  },
  // NEW: Weight information at purchase time
  grossWeight: {
    type: Number,
    min: 0,
    default: 0,
  },
  itemTotal: {
    type: Number,
    required: true,
    min: 0,
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      name: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pinCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: 'India',
      },
      phone: {
        type: String,
        required: true,
      }
    },
    billingAddress: {
      name: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pinCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: 'India',
      },
      phone: {
        type: String,
        required: true,
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    appliedCoupon: {
      code: String,
      discountId: mongoose.Types.ObjectId,
      discountAmount: Number,
    },
    appliedVoucher: {
      code: String,
      discountId: mongoose.Types.ObjectId,
      discountAmount: Number,
    },
    appliedGiftCard: {
      code: String,
      giftCardId: mongoose.Types.ObjectId,
      redeemedAmount: Number,
    },
    totalDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: IOrderStatus,
      default: IOrderStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: IPaymentMethod
    },
    paymentStatus: {
      type: String,
      enum: IPaymentStatus,
      default: IPaymentStatus.CREATED
    },
    trackingNumber: {
      type: String,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
    returnedAt: {
      type: Date,
    },
    returnReason: {
      type: String,
    },
    notes: {
      type: String,
      maxLength: 500,
    }
  },
  { timestamps: true }
);

// Updated indexes
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'items.product': 1, 'items.karat': 1, 'items.sku': 1 });
orderSchema.index({ 'items.stoneType': 1 });
orderSchema.index({ orderNumber: 1 });

export interface IOrderItem {
  _id: string;
  product: mongoose.Types.ObjectId;
  productName: string;
  productId: string;
  productImage: string;
  quantity: number;
  karat: 9 | 14 | 18;
  stoneType: 'regular_diamond' | 'gemstone' | 'colored_diamond';
  sku: string;
  selectedColor?: {
    name: string;
    hexCode?: string;
  };
  selectedSize?: string;
  selectedImage: string;
  priceAtPurchase: number;
  grossWeight: number;
  itemTotal: number;
}

export interface IAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  phone: string;
}

export interface IOrder extends mongoose.Document {
  _id: string;
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IAddress;
  billingAddress: IAddress;
  subtotal: number;
  appliedCoupon?: {
    code: string;
    discountId: mongoose.Types.ObjectId;
    discountAmount: number;
  };
  appliedVoucher?: {
    code: string;
    discountId: mongoose.Types.ObjectId;
    discountAmount: number;
  };
  appliedGiftCard?: {
    code: string;
    giftCardId: mongoose.Types.ObjectId;
    redeemedAmount: number;
  };
  totalDiscountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  total: number;
  status: IOrderStatus;
  paymentMethod?: string;
  paymentStatus: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  returnedAt?: Date;
  returnReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.model<IOrder>('Order', orderSchema);