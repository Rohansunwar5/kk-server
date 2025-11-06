import subCategoryModel, { ISubCategory } from '../models/subcategory.model';

export interface ICreateSubCategoryParams {
  name: string;
  parentCategoryId: string;
  imageUrls?: string[];
  description?: string;
  isActive?: boolean;
}

export interface IUpdateSubCategoryParams {
  name?: string;
  parentCategoryId?: string;
  imageUrls?: string[];
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

  async getSubCategoryByName(name: string): Promise<ISubCategory | null> {
    return this._model.findOne({ name });
  }

  async getSubCategoriesByParentCategoryId(parentCategoryId: string): Promise<ISubCategory[]> {
    return this._model.find({ parentCategoryId, isActive: true });
  }

  async createSubCategory(params: ICreateSubCategoryParams): Promise<ISubCategory> {
    return this._model.create({
      name: params.name,
      parentCategoryId: params.parentCategoryId,
      imageUrls: params.imageUrls || [],
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
        name: params.name,
        parentCategoryId: params.parentCategoryId,
        imageUrls: params.imageUrls,
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

  async addImageToSubCategory(
    id: string,
    imageUrl: string
  ): Promise<ISubCategory | null> {
    return this._model.findByIdAndUpdate(
      id,
      { $addToSet: { imageUrls: imageUrl } },
      { new: true }
    );
  }

  async removeImageFromSubCategory(
    id: string,
    imageUrl: string
  ): Promise<ISubCategory | null> {
    return this._model.findByIdAndUpdate(
      id,
      { $pull: { imageUrls: imageUrl } },
      { new: true }
    );
  }

  async updateParentCategory(
    id: string,
    newParentCategoryId: string
  ): Promise<ISubCategory | null> {
    return this._model.findByIdAndUpdate(
      id,
      { parentCategoryId: newParentCategoryId },
      { new: true }
    );
  }
}