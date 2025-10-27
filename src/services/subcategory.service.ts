import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import { NotFoundError } from '../errors/not-found.error';
import {
  SubCategoryRepository,
  ICreateSubCategoryParams,
  IUpdateSubCategoryParams,
} from '../repository/subcategory.repository';
import { CategoryRepository } from '../repository/category.repository';
import { ProductRepository } from '../repository/product.repository';

class SubCategoryService {
  constructor(
    private readonly _subCategoryRepository: SubCategoryRepository,
    private readonly _categoryRepository: CategoryRepository,
    private readonly _productRepository: ProductRepository
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
    const existingSubCategory = await this._subCategoryRepository.getSubCategoryBySubCategoryId(
      params.subCategoryId
    );

    if (existingSubCategory) {
      throw new BadRequestError('SubCategory with this ID already exists');
    }

    // Verify parent category exists
    const parentCategory = await this._categoryRepository.getCategoryByCategoryId(
      params.parentCategoryId
    );

    if (!parentCategory) {
      throw new NotFoundError('Parent category not found');
    }

    const subCategory = await this._subCategoryRepository.createSubCategory(params);

    if (!subCategory) {
      throw new InternalServerError('Failed to create subcategory');
    }

    // Add subcategory to parent category
    await this._categoryRepository.addSubCategoryToCategory(
      params.parentCategoryId,
      subCategory.subCategoryId
    );

    return subCategory;
  }

  async updateSubCategory(subCategoryId: string, params: IUpdateSubCategoryParams) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(subCategoryId);

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
        subCategory.subCategoryId
      );

      // Add to new parent
      await this._categoryRepository.addSubCategoryToCategory(
        params.parentCategoryId,
        subCategory.subCategoryId
      );
    }

    const updatedSubCategory = await this._subCategoryRepository.updateSubCategoryById(
      subCategoryId,
      params
    );

    if (!updatedSubCategory) {
      throw new InternalServerError('Failed to update subcategory');
    }

    return updatedSubCategory;
  }

  async deleteSubCategory(subCategoryId: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(subCategoryId);

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    // Remove from parent category
    await this._categoryRepository.removeSubCategoryFromCategory(
      subCategory.parentCategoryId,
      subCategory.subCategoryId
    );

    // Soft delete subcategory
    const deletedSubCategory = await this._subCategoryRepository.softDeleteSubCategoryById(
      subCategoryId
    );

    if (!deletedSubCategory) {
      throw new InternalServerError('Failed to delete subcategory');
    }

    return { message: 'SubCategory deleted successfully', deletedSubCategory };
  }

  async hardDeleteSubCategory(subCategoryId: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryById(subCategoryId);

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    await this._categoryRepository.removeSubCategoryFromCategory(
      subCategory.parentCategoryId,
      subCategory.subCategoryId
    );

    const deleteResponse = await this._subCategoryRepository.deleteSubCategoryById(subCategoryId);

    if (!deleteResponse || deleteResponse.deletedCount === 0) {
      throw new InternalServerError('Failed to delete subcategory');
    }

    return { message: 'SubCategory permanently deleted', deleteResponse };
  }

  async addProductToSubCategory(subCategoryId: string, productId: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryBySubCategoryId(
      subCategoryId
    );

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    const product = await this._productRepository.getProductByProductId(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updatedSubCategory = await this._subCategoryRepository.addProductToSubCategory(
      subCategoryId,
      productId
    );

    if (!updatedSubCategory) {
      throw new InternalServerError('Failed to add product to subcategory');
    }

    return updatedSubCategory;
  }

  async removeProductFromSubCategory(subCategoryId: string, productId: string) {
    const subCategory = await this._subCategoryRepository.getSubCategoryBySubCategoryId(
      subCategoryId
    );

    if (!subCategory) {
      throw new NotFoundError('SubCategory not found');
    }

    const updatedSubCategory = await this._subCategoryRepository.removeProductFromSubCategory(
      subCategoryId,
      productId
    );

    if (!updatedSubCategory) {
      throw new InternalServerError('Failed to remove product from subcategory');
    }

    return updatedSubCategory;
  }

  async mapProductsToSubCategories() {
    const subCategories = await this._subCategoryRepository.getAllSubCategories();
    const products = await this._productRepository.getAllProducts();

    if (!subCategories || !products) {
      throw new InternalServerError('Failed to fetch data');
    }

    const updatePromises = subCategories.map(async (subCategory) => {
      const productsInSubCategory = products.filter((product) =>
        product.subCategoryIds && product.subCategoryIds.includes(subCategory.subCategoryId)
      );

      const productIds = productsInSubCategory.map((product) => product.productId);
      
      if (productIds.length > 0) {
        return await this._subCategoryRepository.updateSubCategoryBySubCategoryId(
          subCategory.subCategoryId,
          { productIds }
        );
      }

      return subCategory;
    });

    const updatedSubCategories = await Promise.all(updatePromises);

    return {
      message: 'SubCategories mapped successfully',
      subCategories: updatedSubCategories.filter(Boolean),
    };
  }
}

export default new SubCategoryService(
  new SubCategoryRepository(),
  new CategoryRepository(),
  new ProductRepository()
);