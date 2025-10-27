import subCategoryModel, { ISubCategory } from '../models/subcategory.model';

export interface ICreateSubCategoryParams {
  subCategoryId: string;
  name: string;
  parentCategoryId: string;
  productIds?: string[];
  bannerIds?: string[];
  description?: string;
  isActive?: boolean;
}

export interface IUpdateSubCategoryParams {
  subCategoryId?: string;
  name?: string;
  parentCategoryId?: string;
  productIds?: string[];
  bannerIds?: string[];
  description?: string;
  isActive?: boolean;
}

export class SubCategoryRepository {
  private _model = subCategoryModel;

  async getAllSubCategories(): Promise<ISubCategory[]> {
    return this._model.find({ isActive: true });
  }

  async getSubCategoryById(id: string): Promise<ISubCategory | null> {
    return this._model.findById(id);
  }

  async getSubCategoryBySubCategoryId(subCategoryId: string): Promise<ISubCategory | null> {
    return this._model.findOne({ subCategoryId });
  }

  async getSubCategoryByName(name: string): Promise<ISubCategory | null> {
    return this._model.findOne({ name });
  }

  async getSubCategoriesByParentCategoryId(parentCategoryId: string): Promise<ISubCategory[]> {
    return this._model.find({ parentCategoryId, isActive: true });
  }

  async createSubCategory(params: ICreateSubCategoryParams): Promise<ISubCategory> {
    return this._model.create({
      subCategoryId: params.subCategoryId,
      name: params.name,
      parentCategoryId: params.parentCategoryId,
      productIds: params.productIds || [],
      bannerIds: params.bannerIds || [],
      description: params.description || '',
      isActive: params.isActive !== undefined ? params.isActive : true,
    });
  }

  async updateSubCategoryById(
    id: string,
    params: IUpdateSubCategoryParams
  ): Promise<ISubCategory | null> {
    return this._model.findByIdAndUpdate(
      id,
      {
        subCategoryId: params.subCategoryId,
        name: params.name,
        parentCategoryId: params.parentCategoryId,
        productIds: params.productIds,
        bannerIds: params.bannerIds,
        description: params.description,
        isActive: params.isActive,
      },
      { new: true }
    );
  }

  async updateSubCategoryBySubCategoryId(
    subCategoryId: string,
    params: IUpdateSubCategoryParams
  ): Promise<ISubCategory | null> {
    return this._model.findOneAndUpdate(
      { subCategoryId },
      {
        name: params.name,
        parentCategoryId: params.parentCategoryId,
        productIds: params.productIds,
        bannerIds: params.bannerIds,
        description: params.description,
        isActive: params.isActive,
      },
      { new: true }
    );
  }

  async deleteSubCategoryById(id: string): Promise<{ deletedCount: number }> {
    return this._model.deleteOne({ _id: id });
  }

  async softDeleteSubCategoryById(id: string): Promise<ISubCategory | null> {
    return this._model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  async addProductToSubCategory(
    subCategoryId: string,
    productId: string
  ): Promise<ISubCategory | null> {
    return this._model.findOneAndUpdate(
      { subCategoryId },
      { $addToSet: { productIds: productId } },
      { new: true }
    );
  }

  async removeProductFromSubCategory(
    subCategoryId: string,
    productId: string
  ): Promise<ISubCategory | null> {
    return this._model.findOneAndUpdate(
      { subCategoryId },
      { $pull: { productIds: productId } },
      { new: true }
    );
  }

  async addBannerToSubCategory(
    subCategoryId: string,
    bannerId: string
  ): Promise<ISubCategory | null> {
    return this._model.findOneAndUpdate(
      { subCategoryId },
      { $addToSet: { bannerIds: bannerId } },
      { new: true }
    );
  }

  async removeBannerFromSubCategory(
    subCategoryId: string,
    bannerId: string
  ): Promise<ISubCategory | null> {
    return this._model.findOneAndUpdate(
      { subCategoryId },
      { $pull: { bannerIds: bannerId } },
      { new: true }
    );
  }

  async updateParentCategory(
    subCategoryId: string,
    newParentCategoryId: string
  ): Promise<ISubCategory | null> {
    return this._model.findOneAndUpdate(
      { subCategoryId },
      { parentCategoryId: newParentCategoryId },
      { new: true }
    );
  }
}