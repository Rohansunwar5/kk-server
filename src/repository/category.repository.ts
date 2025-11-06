import categoryModel, { ICategory } from '../models/category.model';

export interface ICreateCategoryParams {
  categoryId: string;
  name: string;
  subCategoryIds?: string[];
  imageUrl?: string[];
  description?: string;
  isActive?: boolean;
}

export interface IUpdateCategoryParams {
  categoryId?: string;
  name?: string;
  subCategoryIds?: string[];
  imageUrl?: string[];
  description?: string;
  isActive?: boolean;
}

export class CategoryRepository {
  private _model = categoryModel;

  async getAllCategories(): Promise<ICategory[]> {
    return this._model.find({ isActive: true });
  }

  async getCategoryById(id: string): Promise<ICategory | null> {
  // Uses MongoDB _id directly
  return this._model.findById(id);
}

  async getCategoryByCategoryId(categoryId: string): Promise<ICategory | null> {
    return this._model.findOne({ categoryId });
  }

  async getCategoryByName(name: string): Promise<ICategory | null> {
    return this._model.findOne({ name });
  }

  async createCategory(params: ICreateCategoryParams): Promise<ICategory> {
    return this._model.create({
      categoryId: params.categoryId,
      name: params.name,
      subCategoryIds: params.subCategoryIds || [],
      imageUrl: params.imageUrl || [],
      description: params.description || '',
      isActive: params.isActive !== undefined ? params.isActive : true,
    });
  }

  async updateCategoryById(id: string, params: IUpdateCategoryParams): Promise<ICategory | null> {
    // Update only the fields passed in params, no categoryId included
    return this._model.findByIdAndUpdate(
      id,
      {
        name: params.name,
        subCategoryIds: params.subCategoryIds,
        imageUrl: params.imageUrl,
        description: params.description,
        isActive: params.isActive
      },
      { new: true }
    );
  }
  async updateCategoryByCategoryId(
    categoryId: string,
    params: IUpdateCategoryParams
  ): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      {
        name: params.name,
        subCategoryIds: params.subCategoryIds,
        imageUrl: params.imageUrl,
        description: params.description,
        isActive: params.isActive,
      },
      { new: true }
    );
  }

  async deleteCategoryById(id: string): Promise<{ deletedCount: number }> {
    return this._model.deleteOne({ _id: id });
  }

  async softDeleteCategoryById(id: string): Promise<ICategory | null> {
    return this._model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  async addProductToCategory(categoryId: string, productId: string): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      { $addToSet: { productIds: productId } },
      { new: true }
    );
  }

  async removeProductFromCategory(categoryId: string, productId: string): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      { $pull: { productIds: productId } },
      { new: true }
    );
  }

  async addSubCategoryToCategory(categoryId: string, subCategoryId: string): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      { $addToSet: { subCategoryIds: subCategoryId } },
      { new: true }
    );
  }

  async removeSubCategoryFromCategory(
    categoryId: string,
    subCategoryId: string
  ): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      { $pull: { subCategoryIds: subCategoryId } },
      { new: true }
    );
  }

  async addBannerToCategory(categoryId: string, bannerId: string): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      { $addToSet: { bannerIds: bannerId } },
      { new: true }
    );
  }

  async removeBannerFromCategory(categoryId: string, bannerId: string): Promise<ICategory | null> {
    return this._model.findOneAndUpdate(
      { categoryId },
      { $pull: { bannerIds: bannerId } },
      { new: true }
    );
  }
}