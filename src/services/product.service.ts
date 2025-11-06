import { ICreateProductParams, IPaginationParams, IProductFilters, ProductRepository } from '../repository/product.repository';
import { BadRequestError } from '../errors/bad-request.error';
import { NotFoundError } from '../errors/not-found.error';
import { InternalServerError } from '../errors/internal-server.error';
import { getProductPriceDetails, KaratType } from '../utils/DiamondPriceCalculation';
import { IProduct, IVariant, ICustomizationOptions } from '../models/product.model';
import mongoose from 'mongoose';

type StoneType = 'regular_diamond' | 'gemstone' | 'colored_diamond';

interface CreateProductInput extends Omit<ICreateProductParams, 'variants' | 'customizationOptions'> {
    karats: KaratType[];
    stoneTypes?: StoneType[]; // Optional: if product has stone type customization
    stocks?: Record<string, number>; // Key format: "14-gemstone" or "14" (if no stone types)
    customizationOptions?: Partial<ICustomizationOptions>;
}

class ProductService {
  constructor(private readonly _productRepository: ProductRepository) {}

  async searchProducts(query: string) {
    if (!query || query.trim() === '') {
      throw new BadRequestError('Search query is required');
    }

    const products = await this._productRepository.searchProducts(query.trim(), 20);
    return products;
  }

  async getAllProducts() {
    const products = await this._productRepository.getAllProducts();
    if (!products) {
      throw new InternalServerError('Failed to fetch products');
    }
    return products;
  }

  async getProducts(filters: IProductFilters, pagination: IPaginationParams) {
    const page = Math.max(1, pagination.page);
    const limit = Math.min(39, pagination.limit);

    const { products, total } = await this._productRepository.getProducts(filters, { page, limit });

    if (!products) {
      throw new InternalServerError('Failed to fetch products');
    }

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProductById(id: string) {
    if (!id) {
      throw new BadRequestError('Product ID is required');
    }

    const product = await this._productRepository.getProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with id '${id}' not found`);
    }

    return product;
  }

  async getProductByProductId(productId: string) {
    if (!productId) {
      throw new BadRequestError('Product ID is required');
    }

    const product = await this._productRepository.getProductByProductId(productId);
    if (!product) {
      throw new NotFoundError(`Product with productId '${productId}' not found`);
    }

    return product;
  }

  async createProduct(params: CreateProductInput) {
    const existingProduct = await this._productRepository.getProductByProductId(params.productId);
    if (existingProduct) {
      throw new BadRequestError(`Product with ID '${params.productId}' already exists`);
    }

    // Convert string IDs to ObjectIds
    const categoryIds = params.categoryIds.map(id => 
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    );
    const subCategoryIds = params.subCategoryIds?.map(id => 
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    );
    const collectionIds = params.collectionIds?.map(id => 
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    );

    // Determine stone types to create
    const stoneTypes: StoneType[] = params.stoneTypes && params.stoneTypes.length > 0
      ? params.stoneTypes
      : ['regular_diamond']; // Default if no stone type customization

    // Generate variants for all combinations of karat + stone type
    const variants: IVariant[] = [];
    
    for (const karat of params.karats) {
      for (const stoneType of stoneTypes) {
        const priceDetails = this.calculateVariantPrice(params, karat, stoneType);
        const stockKey = stoneTypes.length > 1 ? `${karat}-${stoneType}` : `${karat}`;
        const stock = params.stocks?.[stockKey] || 0;

        variants.push({
          karat,
          stoneType,
          sku: `${params.productId}-${karat}K-${stoneType.toUpperCase()}`,
          price: priceDetails.total,
          stock,
          grossWeight: priceDetails.grossWeight,
          isAvailable: true
        });
      }
    }

    // Setup customization options
    const customizationOptions: ICustomizationOptions = {
      hasColorOptions: params.customizationOptions?.hasColorOptions || false,
      colors: params.customizationOptions?.colors || [],
      hasSizeOptions: params.customizationOptions?.hasSizeOptions || false,
      sizes: params.customizationOptions?.sizes || [],
      hasStoneTypeOptions: stoneTypes.length > 1,
      stoneTypes: stoneTypes.length > 1
        ? stoneTypes.map(type => ({
            type,
            label: this.getStoneTypeLabel(type),
            isAvailable: true
          }))
        : []
    };

    const productData: ICreateProductParams = {
      ...params,
      categoryIds,
      subCategoryIds,
      collectionIds,
      customizationOptions,
      variants
    };

    // Remove temporary fields
    delete (productData as any).karats;
    delete (productData as any).stoneTypes;
    delete (productData as any).stocks;

    const product = await this._productRepository.createProduct(productData);
    if (!product) {
      throw new InternalServerError('Failed to create product');
    }

    return product;
  }

  async updateProduct(
    id: string, 
    updateData: Partial<CreateProductInput>
  ) {
    if (!id) {
      throw new BadRequestError('Product ID is required');
    }

    const existingProduct = await this._productRepository.getProductById(id);
    if (!existingProduct) {
      throw new NotFoundError(`Product with id '${id}' not found`);
    }

    // Convert string IDs to ObjectIds if provided
    if (updateData.categoryIds) {
      updateData.categoryIds = updateData.categoryIds.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      ) as any;
    }
    if (updateData.subCategoryIds) {
      updateData.subCategoryIds = updateData.subCategoryIds.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      ) as any;
    }
    if (updateData.collectionIds) {
      updateData.collectionIds = updateData.collectionIds.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      ) as any;
    }

    const mergedData = { ...existingProduct, ...updateData };

    // Regenerate variants if karats or stone types changed
    let variants: IVariant[];
    let customizationOptions = existingProduct.customizationOptions;

    if (updateData.karats || updateData.stoneTypes) {
      const karats = updateData.karats || existingProduct.variants.map(v => v.karat).filter((v, i, a) => a.indexOf(v) === i);
      const stoneTypes = updateData.stoneTypes || 
        existingProduct.variants.map(v => v.stoneType).filter((v, i, a) => a.indexOf(v) === i);

      variants = [];
      for (const karat of karats) {
        for (const stoneType of stoneTypes) {
          const priceDetails = this.calculateVariantPrice(mergedData, karat, stoneType);
          const existingVariant = existingProduct.variants.find(
            v => v.karat === karat && v.stoneType === stoneType
          );
          const stockKey = stoneTypes.length > 1 ? `${karat}-${stoneType}` : `${karat}`;
          const stock = updateData.stocks?.[stockKey] ?? existingVariant?.stock ?? 0;

          variants.push({
            karat,
            stoneType,
            sku: `${existingProduct.productId}-${karat}K-${stoneType.toUpperCase()}`,
            price: priceDetails.total,
            stock,
            grossWeight: priceDetails.grossWeight,
            isAvailable: existingVariant?.isAvailable ?? true
          });
        }
      }

      // Update customization options
      customizationOptions = {
        ...existingProduct.customizationOptions,
        hasStoneTypeOptions: stoneTypes.length > 1,
        stoneTypes: stoneTypes.length > 1
          ? stoneTypes.map(type => ({
              type,
              label: this.getStoneTypeLabel(type),
              isAvailable: true
            }))
          : []
      };
    } else {
      // Recalculate prices for existing variants
      variants = existingProduct.variants.map(variant => {
        const priceDetails = this.calculateVariantPrice(mergedData, variant.karat, variant.stoneType);
        return {
          ...variant,
          price: priceDetails.total,
          grossWeight: priceDetails.grossWeight
        };
      });
    }

    // Update customization options if provided
    if (updateData.customizationOptions) {
      customizationOptions = {
        ...customizationOptions,
        ...updateData.customizationOptions
      };
    }

    const finalUpdateData: any = { 
      ...updateData, 
      variants,
      customizationOptions 
    };
    delete finalUpdateData.karats;
    delete finalUpdateData.stoneTypes;
    delete finalUpdateData.stocks;

    const updatedProduct = await this._productRepository.updateProduct({
      _id: id,
      ...finalUpdateData
    });

    if (!updatedProduct) {
      throw new InternalServerError('Failed to update product');
    }

    return updatedProduct;
  }

  async deleteProduct(id: string) {
    if (!id) {
      throw new BadRequestError('Product ID is required');
    }

    const deleted = await this._productRepository.deleteProduct(id);
    if (!deleted) {
      throw new NotFoundError(`Product with id '${id}' not found or already deleted`);
    }

    return { message: 'Product deleted successfully' };
  }

  async deleteMultipleProducts(ids: string[]) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('Valid product IDs array is required');
    }

    const deletedCount = await this._productRepository.deleteMultipleProducts(ids);
    
    return {
      message: 'Products deleted successfully',
      deletedCount
    };
  }

  // Helper: Calculate variant price based on karat and stone type
  private calculateVariantPrice(
    product: any,
    karat: KaratType,
    stoneType: StoneType = 'regular_diamond',
    customGoldRates?: { 9?: number; 14?: number; 18?: number }
  ) {
    const isColouredDiamond = stoneType === 'colored_diamond';
    const isGemStoneProduct = stoneType === 'gemstone' || product.containsGemstone;

    return getProductPriceDetails({
      karat: karat,
      netWeight: product.netWeight || 0,
      solitareWeight: product.solitareWeight || 0,
      multiDiaWeight: product.multiDiamondWeight || 0,
      pointersWeight: product.pointersWeight || 0,
      gemStoneSolWeight: product.gemStoneWeightSol || 0,
      gemStonePointerWeight: product.gemStoneWeightPointer || 0,
      isGemStoneProduct,
      isColouredDiamond,
      isChainAdded: product.isPendantFixed || false,
      chainKarat: karat,
    });
  }

  // Helper: Get user-friendly label for stone type
  private getStoneTypeLabel(stoneType: StoneType): string {
    const labels = {
      regular_diamond: 'Natural Diamond',
      gemstone: 'Natural Gemstone',
      colored_diamond: 'Lab Grown Colored Diamond'
    };
    return labels[stoneType];
  }

  // Update all product prices when gold rates change
  async updateAllProductPrices(newGoldRates: { 9: number; 14: number; 18: number }) {
    const products = await this._productRepository.getActiveProducts();
    
    const updates = products.map(product => {
      const updatedVariants = product.variants.map(variant => {
        const priceDetails = this.calculateVariantPrice(
          product, 
          variant.karat, 
          variant.stoneType,
          newGoldRates
        );
        return {
          ...variant,
          price: priceDetails.total,
          grossWeight: priceDetails.grossWeight
        };
      });

      return {
        _id: product._id,
        variants: updatedVariants
      };
    });

    await this._productRepository.updateMultipleProductVariants(updates);

    return {
      message: 'All product prices updated successfully',
      productsUpdated: updates.length,
      variantsUpdated: updates.reduce((sum, p) => sum + p.variants.length, 0)
    };
  }

  async updateProductPricesByKarat(
    karat: KaratType,
    newGoldRate: number
  ) {
    const products = await this._productRepository.getProductsByKarat(karat);
    
    const updates = products.map(product => {
      const updatedVariants = product.variants.map(variant => {
        if (variant.karat === karat) {
          const priceDetails = this.calculateVariantPrice(
            product, 
            karat, 
            variant.stoneType,
            { [karat]: newGoldRate } as any
          );
          return {
            ...variant,
            price: priceDetails.total,
            grossWeight: priceDetails.grossWeight
          };
        }
        return variant;
      });

      return {
        _id: product._id,
        variants: updatedVariants
      };
    });

    await this._productRepository.updateMultipleProductVariants(updates);

    return {
      message: `Updated all ${karat}K variants`,
      productsUpdated: updates.length
    };
  }

  // Other existing methods remain the same...
  async mapImagesToProducts(imageList: Record<string, Array<{ url: string; publicId: string }>>) {
    if (!imageList) {
      throw new BadRequestError('Image list is required');
    }

    const allProducts = await this._productRepository.getAllProducts();
    
    const productMap: Record<string, IProduct> = {};
    allProducts.forEach(product => {
      const normalizedId = product.productId.toLowerCase().replace(/\s+/g, ' ').trim();
      productMap[normalizedId] = product;
    });

    let updateCount = 0;
    const updates: Array<{ productId: string; updates: Partial<IProduct> }> = [];

    for (const [imageKey, imageDataArray] of Object.entries(imageList)) {
      if (!Array.isArray(imageDataArray) || imageDataArray.length === 0) continue;

      const normalizedImageKey = imageKey
        .replace(/_/g, ' ')
        .replace(/\.(webp|jpg|jpeg|png)$/i, '')
        .toLowerCase()
        .trim();

      const matchingProduct = productMap[normalizedImageKey];
      
      if (matchingProduct) {
        const formattedImages = imageDataArray.map(img => ({
          url: img.url,
          publicId: img.publicId
        }));

        updates.push({
          productId: matchingProduct.productId,
          updates: { imageUrl: formattedImages }
        });
        updateCount++;
      }
    }

    if (updates.length > 0) {
      await this._productRepository.bulkUpdateProducts(updates);
    }

    return {
      message: `Successfully mapped ${updateCount} images to products`,
      count: updateCount
    };
  }

  async setBasePrices() {
    const products = await this._productRepository.getAllProducts();
    
    const updates = products.map(product => {
      const updatedVariants = product.variants.map(variant => {
        const priceDetails = this.calculateVariantPrice(product, variant.karat, variant.stoneType);
        return {
          ...variant,
          price: priceDetails.subTotal,
          grossWeight: priceDetails.grossWeight
        };
      });

      return {
        _id: product._id,
        variants: updatedVariants
      };
    });

    await this._productRepository.updateMultipleProductVariants(updates);

    return {
      message: 'Base prices set successfully',
      productsUpdated: updates.length
    };
  }

  async bulkUpdateField(
    productIds: string[],
    field: string,
    value: any
  ) {
    const updates = productIds.map(productId => ({
      productId,
      updates: { [field]: value }
    }));

    await this._productRepository.bulkUpdateProducts(updates);

    return {
      message: `Field '${field}' updated successfully`,
      productsUpdated: productIds.length
    };
  }

  async reduceStockForOrder(orderItems: Array<{
    productId: string;
    sku: string;
    karat: number;
    quantity: number;
  }>) {
    const errors: string[] = [];

    for (const item of orderItems) {
      try {
        const product = await this.getProductById(item.productId);
        if (!product) {
          errors.push(`Product not found: ${item.productId}`);
          continue;
        }

        // Find the variant by SKU and karat
        const variantIndex = product.variants.findIndex(
          v => v.sku === item.sku && v.karat === item.karat
        );

        if (variantIndex === -1) {
          errors.push(`Variant not found for SKU: ${item.sku}, Karat: ${item.karat}`);
          continue;
        }

        const variant = product.variants[variantIndex];

        // Check if variant has enough stock
        if (variant.stock < item.quantity) {
          errors.push(
            `Insufficient stock for SKU: ${item.sku}. Available: ${variant.stock}, Required: ${item.quantity}`
          );
          continue;
        }

        // Reduce the stock
        const newStock = variant.stock - item.quantity;
        await this._productRepository.updateVariantStock(
          item.productId,
          item.sku,
          newStock
        );

      } catch (error: any) {
        errors.push(`Failed to reduce stock for SKU ${item.sku}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestError(`Stock reduction failed: ${errors.join('; ')}`);
    }

    return { success: true, message: 'Stock reduced successfully' };
  }

  /**
   * Update stock for a specific variant (can add or reduce stock)
   * Used for restoring stock on order cancellation/return
   * @param params - Object with productId, sku, and quantity (positive to add, negative to reduce)
   */
  async updateProductStockByVariant(params: {
    productId: string;
    sku: string;
    quantity: number;
  }) {
    const { productId, sku, quantity } = params;

    const product = await this.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product not found: ${productId}`);
    }

    // Find the variant by SKU
    const variantIndex = product.variants.findIndex(v => v.sku === sku);

    if (variantIndex === -1) {
      throw new NotFoundError(`Variant not found for SKU: ${sku}`);
    }

    const variant = product.variants[variantIndex];
    
    // Add the quantity (positive for restore, negative for reduce)
    const newStock = variant.stock + quantity;

    if (newStock < 0) {
      throw new BadRequestError(
        `Cannot set negative stock. Current: ${variant.stock}, Change: ${quantity}`
      );
    }

    const updatedProduct = await this._productRepository.updateVariantStock(
      productId,
      sku,
      newStock
    );

    if (!updatedProduct) {
      throw new InternalServerError('Failed to update variant stock');
    }

    return updatedProduct;
  }

  /**
   * Get variant stock by SKU
   * @param productId - Product ID
   * @param sku - Variant SKU
   */
  async getVariantStock(productId: string, sku: string): Promise<number> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product not found: ${productId}`);
    }

    const variant = product.variants.find(v => v.sku === sku);
    if (!variant) {
      throw new NotFoundError(`Variant not found for SKU: ${sku}`);
    }

    return variant.stock;
  }

  /**
   * Bulk update variant stock (useful for admin inventory management)
   * @param updates - Array of stock updates
   */
  async bulkUpdateVariantStock(updates: Array<{
    productId: string;
    sku: string;
    stock: number;
  }>) {
    const results = {
      success: [] as string[],
      failed: [] as { sku: string; error: string }[]
    };

    for (const update of updates) {
      try {
        await this._productRepository.updateVariantStock(
          update.productId,
          update.sku,
          update.stock
        );
        results.success.push(update.sku);
      } catch (error: any) {
        results.failed.push({
          sku: update.sku,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default new ProductService(new ProductRepository());