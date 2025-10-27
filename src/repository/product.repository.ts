import Product, { IProduct, IVariant } from '../models/product.model';
import mongoose from 'mongoose';

export interface ICreateProductParams {
  productId: string;
  name: string;
  categoryIds: string[];
  subCategoryIds?: string[];
  collectionIds?: string[];
  netWeight: number;
  solitareWeight?: number;
  multiDiamondWeight?: number;
  pointersWeight?: number;
  diamondWeight?: number;
  goldWeight?: number;
  noOfSolitares?: number;
  noOfMultiDiamonds?: number;
  noOfPointers?: number;
  gender?: "Male" | "Female" | "Unisex";
  shapeOfSolitare?: string;
  shapeOfMultiDiamonds?: string;
  shapeOfPointers?: string;
  gemStoneColour?: string[];
  description?: string;
  quantitySold?: number;
  imageUrl?: Array<{ url: string; publicId: string }>;
  isPendantFixed?: boolean;
  containsGemstone?: boolean;
  gemStoneWeightSol?: number;
  gemStoneWeightPointer?: number;
  isMrpProduct?: boolean;
  variants: IVariant[];
  isActive?: boolean;
}

export interface IUpdateProductParams extends Partial<ICreateProductParams> {
  _id: string;
}

export interface IProductFilters {
  gender?: {
    male?: boolean;
    female?: boolean;
  };
  price?: {
    min?: number;
    max?: number;
  };
  categories?: string[];
  collections?: string[];
}

export interface IPaginationParams {
  page: number;
  limit: number;
}

export class ProductRepository {
  private _model = Product;

  async getProductById(id: string): Promise<IProduct | null> {
    return this._model.findById(id).lean();
  }

  async getProductByProductId(productId: string): Promise<IProduct | null> {
    return this._model.findOne({ productId }).lean();
  }

  async searchProducts(query: string, limit: number = 20): Promise<IProduct[]> {
    return this._model
      .find({
        name: { $regex: query, $options: 'i' }
      })
      .limit(limit)
      .lean();
  }

  async getAllProducts(): Promise<IProduct[]> {
    return this._model.find().lean();
  }

  async getProducts(
    filters: IProductFilters,
    pagination: IPaginationParams
  ): Promise<{ products: IProduct[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Gender filter
    if (filters.gender?.male || filters.gender?.female) {
      const genders: string[] = [];
      if (filters.gender.male) genders.push('Male');
      if (filters.gender.female) genders.push('Female');
      query.gender = { $in: genders };
    }

    // Price filter
    if (filters.price?.min !== undefined || filters.price?.max !== undefined) {
      const minPrice = filters.price.min !== undefined ? Number(filters.price.min) : 0;
      const maxPrice = filters.price.max !== undefined ? Number(filters.price.max) : Infinity;

      if (!isNaN(minPrice) && !isNaN(maxPrice)) {
        query['variants.price'] = {
          $gte: minPrice,
          $lte: maxPrice
        };
      }
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      query.categoryIds = { $in: filters.categories };
    }

    // Collection filter
    if (filters.collections && filters.collections.length > 0) {
      const validCollectionIds = filters.collections.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );
      if (validCollectionIds.length > 0) {
        query.collectionIds = { $in: validCollectionIds };
      }
    }

    const [products, total] = await Promise.all([
      this._model.find(query).skip(skip).limit(limit).lean(),
      this._model.countDocuments(query)
    ]);

    return { products, total };
  }

  async createProduct(params: ICreateProductParams): Promise<IProduct> {
    return this._model.create(params);
  }

  async updateProduct(params: IUpdateProductParams): Promise<IProduct | null> {
    const { _id, ...updateData } = params;
    return this._model.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true }).lean();
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await this._model.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async deleteMultipleProducts(ids: string[]): Promise<number> {
    const result = await this._model.deleteMany({ _id: { $in: ids } });
    return result.deletedCount || 0;
  }

  async updateProductImages(
    productId: string,
    images: Array<{ url: string; publicId: string }>
  ): Promise<IProduct | null> {
    return this._model.findOneAndUpdate(
      { productId },
      { $set: { imageUrl: images } },
      { new: true }
    ).lean();
  }

  async updateProductVariantPrice(
    productId: string,
    karat: number,
    price: number,
    grossWeight: number
  ): Promise<IProduct | null> {
    return this._model.findOneAndUpdate(
      { productId, 'variants.karat': karat },
      {
        $set: {
          'variants.$.price': price,
          'variants.$.grossWeight': grossWeight
        }
      },
      { new: true }
    ).lean();
  }

  async updateMultipleProductVariants(
    products: Array<{
      _id: string;
      variants: IVariant[];
    }>
  ): Promise<void> {
    const bulkOps = products.map(product => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { variants: product.variants } }
      }
    }));

    await this._model.bulkWrite(bulkOps);
  }

  async getProductsByKarat(karat: number): Promise<IProduct[]> {
    return this._model.find({
      'variants.karat': karat,
      isActive: true
    }).lean();
  }

  async getActiveProducts(): Promise<IProduct[]> {
    return this._model.find({ isActive: true }).lean();
  }

  async updateProductField(
    productId: string,
    field: string,
    value: any
  ): Promise<IProduct | null> {
    return this._model.findOneAndUpdate(
      { productId },
      { $set: { [field]: value } },
      { new: true }
    ).lean();
  }

  async bulkUpdateProducts(
    updates: Array<{ productId: string; updates: Partial<IProduct> }>
  ): Promise<void> {
    const bulkOps = updates.map(({ productId, updates }) => ({
      updateOne: {
        filter: { productId },
        update: { $set: updates }
      }
    }));

    await this._model.bulkWrite(bulkOps);
  }

  async getProductsByIds(ids: string[]): Promise<IProduct[]> {
    return this._model.find({ _id: { $in: ids } }).lean();
  }

  async getProductsByProductIds(productIds: string[]): Promise<IProduct[]> {
    return this._model.find({ productId: { $in: productIds } }).lean();
  }

  async countProducts(query: any = {}): Promise<number> {
    return this._model.countDocuments(query);
  }

  async addVariantToProduct(
    productId: string,
    variant: IVariant
  ): Promise<IProduct | null> {
    return this._model.findOneAndUpdate(
      { productId },
      { $push: { variants: variant } },
      { new: true }
    ).lean();
  }

  async removeVariantFromProduct(
    productId: string,
    karat: number
  ): Promise<IProduct | null> {
    return this._model.findOneAndUpdate(
      { productId },
      { $pull: { variants: { karat } } },
      { new: true }
    ).lean();
  }

  async getProductsByCategoryIds(categoryIds: string[]): Promise<IProduct[]> {
    return this._model.find({
      categoryIds: { $in: categoryIds }
    }).lean();
  }

  async getProductsByCollectionIds(collectionIds: string[]): Promise<IProduct[]> {
    return this._model.find({
      collectionIds: { $in: collectionIds }
    }).lean();
  }
}

export default new ProductRepository();