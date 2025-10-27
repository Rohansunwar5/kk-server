import { ICreateProductParams, IPaginationParams, IProductFilters, ProductRepository } from '../repository/product.repository';
import { BadRequestError } from '../errors/bad-request.error';
import { NotFoundError } from '../errors/not-found.error';
import { InternalServerError } from '../errors/internal-server.error';
import { getProductPriceDetails, KaratType } from '../utils/DiamondPriceCalculation';
import { IProduct, IVariant } from '../models/product.model';

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

  async createProduct(params: ICreateProductParams) {
    const existingProduct = await this._productRepository.getProductByProductId(params.productId);
    if (existingProduct) {
      throw new BadRequestError(`Product with ID '${params.productId}' already exists`);
    }

    const variantsWithPrices = params.variants.map(variant => {
      const priceDetails = this.calculateVariantPrice(params, variant.karat);
      return {
        ...variant,
        price: priceDetails.total,
        grossWeight: priceDetails.grossWeight
      };
    });

    const productData = {
      ...params,
      variants: variantsWithPrices
    };

    const product = await this._productRepository.createProduct(productData);
    if (!product) {
      throw new InternalServerError('Failed to create product');
    }

    return product;
  }

  async updateProduct(id: string, updateData: Partial<ICreateProductParams>) {
    if (!id) {
      throw new BadRequestError('Product ID is required');
    }

    const existingProduct = await this._productRepository.getProductById(id);
    if (!existingProduct) {
      throw new NotFoundError(`Product with id '${id}' not found`);
    }

    // If variants are being updated, recalculate prices
    if (updateData.variants) {
      const mergedData = { ...existingProduct, ...updateData };
      updateData.variants = updateData.variants.map(variant => {
        const priceDetails = this.calculateVariantPrice(mergedData, variant.karat);
        return {
          ...variant,
          price: priceDetails.total,
          grossWeight: priceDetails.grossWeight
        };
      });
    }

    const updatedProduct = await this._productRepository.updateProduct({
      _id: id,
      ...updateData
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

  async mapImagesToProducts(imageList: Record<string, Array<{ url: string; publicId: string }>>) {
    if (!imageList) {
      throw new BadRequestError('Image list is required');
    }

    const allProducts = await this._productRepository.getAllProducts();
    
    // Create a map of normalized product IDs to products
    const productMap: Record<string, IProduct> = {};
    allProducts.forEach(product => {
      const normalizedId = product.productId.toLowerCase().replace(/\s+/g, ' ').trim();
      productMap[normalizedId] = product;
    });

    let updateCount = 0;
    const updates: Array<{ productId: string; updates: Partial<IProduct> }> = [];

    for (const [imageKey, imageDataArray] of Object.entries(imageList)) {
      if (!Array.isArray(imageDataArray) || imageDataArray.length === 0) continue;

      // Normalize the image key
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

  async updateAllProductPrices(newGoldRates: { 9: number; 14: number; 18: number }) {
    const products = await this._productRepository.getActiveProducts();
    
    const updates = products.map(product => {
      const updatedVariants = product.variants.map(variant => {
        const priceDetails = this.calculateVariantPrice(product, variant.karat, newGoldRates);
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
          const priceDetails = this.calculateVariantPrice(product, karat, { [karat]: newGoldRate } as any);
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

  async addVariantToProduct(
    productId: string,
    karat: KaratType,
    stock: number = 0
  ) {
    const product = await this._productRepository.getProductByProductId(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check if variant already exists
    const existingVariant = product.variants.find(v => v.karat === karat);
    if (existingVariant) {
      throw new BadRequestError(`${karat}K variant already exists`);
    }

    // Calculate price for new variant
    const priceDetails = this.calculateVariantPrice(product, karat);

    const newVariant: IVariant = {
      karat,
      sku: `${productId}-${karat}K`,
      price: priceDetails.total,
      stock,
      grossWeight: priceDetails.grossWeight,
      isAvailable: true
    };

    const updatedProduct = await this._productRepository.addVariantToProduct(productId, newVariant);
    
    return {
      message: `${karat}K variant added successfully`,
      variant: newVariant,
      product: updatedProduct
    };
  }

  // Helper method to calculate variant price
  private calculateVariantPrice(
    product: any,
    karat: KaratType,
    customGoldRates?: { 9?: number; 14?: number; 18?: number }
  ) {
    return getProductPriceDetails({
      karat: karat,
      netWeight: product.netWeight || 0,
      solitareWeight: product.solitareWeight || 0,
      multiDiaWeight: product.multiDiamondWeight || 0,
      pointersWeight: product.pointersWeight || 0,
      gemStoneSolWeight: product.gemStoneWeightSol || 0,
      gemStonePointerWeight: product.gemStoneWeightPointer || 0,
      isGemStoneProduct: product.containsGemstone || false,
      isColouredDiamond: false,
      isChainAdded: product.isPendantFixed || false,
      chainKarat: karat,
    });
  }

  async setBasePrices() {
    const products = await this._productRepository.getAllProducts();
    
    const updates = products.map(product => {
      const updatedVariants = product.variants.map(variant => {
        const priceDetails = this.calculateVariantPrice(product, variant.karat);
        return {
          ...variant,
          price: priceDetails.subTotal, // Use subTotal as base price
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
}

export default new ProductService(new ProductRepository());