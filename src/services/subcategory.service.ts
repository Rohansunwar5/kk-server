import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import { NotFoundError } from '../errors/not-found.error';
import {
  SubCategoryRepository,
  ICreateSubCategoryParams,
  IUpdateSubCategoryParams,
} from '../repository/subcategory.repository';
import { CategoryRepository } from '../repository/category.repository';

class SubCategoryService {
  constructor(
    private readonly _subCategoryRepository: SubCategoryRepository,
    private readonly _categoryRepository: CategoryRepository
  ) {}

  async getAllSubCategories() {
    const subCategories = await this._subCategoryRepository.getAllSubCategories();

    if (!subCategories) {
      throw new InternalServerError('Failed to fetch subcategories');
    }

    return subCategories;
  }

  async getSubCategoryById(id: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(id);

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    return subCategory;
  }

  async getSubCategoriesByParentCategoryId(parentCategoryId: string) {
    const parentCategory = await this._categoryRepository.getCategoryByCategoryId(parentCategoryId);

    if (!parentCategory) {
      throw new NotFoundError('Parent category not found');
    }

    const subCategories = await this._subCategoryRepository.getSubCategoriesByParentCategoryId(
      parentCategoryId
    );

    return subCategories;
  }

  async createSubCategory(params: ICreateSubCategoryParams) {
    // Verify parent category exists
    const parentCategory = await this._categoryRepository.getCategoryById(
      params.parentCategoryId
    );

    if (!parentCategory) {
      throw new NotFoundError('Parent category not found');
    }

    const subCategory = await this._subCategoryRepository.createSubCategory(params);

    if (!subCategory) {
      throw new InternalServerError('Failed to create subcategory');
    }

    // Add subcategory to parent category using MongoDB _id
    await this._categoryRepository.addSubCategoryToCategory(
      params.parentCategoryId,
      subCategory._id
    );

    return subCategory;
  }

  async updateSubCategory(id: string, params: IUpdateSubCategoryParams) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(id);

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    // If parent category is being changed, verify new parent exists
    if (params.parentCategoryId && params.parentCategoryId !== subCategory.parentCategoryId) {
      const newParentCategory = await this._categoryRepository.getCategoryByCategoryId(
        params.parentCategoryId
      );

      if (!newParentCategory) {
        throw new NotFoundError('New parent category not found');
      }

      // Remove from old parent
      await this._categoryRepository.removeSubCategoryFromCategory(
        subCategory.parentCategoryId,
        subCategory._id
      );

      // Add to new parent
      await this._categoryRepository.addSubCategoryToCategory(
        params.parentCategoryId,
        subCategory._id
      );
    }

    const updatedSubCategory = await this._subCategoryRepository.updateSubCategoryById(
      id,
      params
    );

    if (!updatedSubCategory) {
      throw new InternalServerError('Failed to update subcategory');
    }

    return updatedSubCategory;
  }

  async deleteSubCategory(id: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(id);

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    // Remove from parent category
    await this._categoryRepository.removeSubCategoryFromCategory(
      subCategory.parentCategoryId,
      subCategory._id
    );

    // Soft delete subcategory
    const deletedSubCategory = await this._subCategoryRepository.softDeleteSubCategoryById(id);

    if (!deletedSubCategory) {
      throw new InternalServerError('Failed to delete subcategory');
    }

    return { message: 'SubCategory deleted successfully', deletedSubCategory };
  }

  async hardDeleteSubCategory(id: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(id);

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    await this._categoryRepository.removeSubCategoryFromCategory(
      subCategory.parentCategoryId,
      subCategory._id
    );

    const deleteResponse = await this._subCategoryRepository.deleteSubCategoryById(id);

    if (!deleteResponse || deleteResponse.deletedCount === 0) {
      throw new InternalServerError('Failed to delete subcategory');
    }

    return { message: 'SubCategory permanently deleted', deleteResponse };
  }
}

export default new SubCategoryService(
  new SubCategoryRepository(),
  new CategoryRepository()
);