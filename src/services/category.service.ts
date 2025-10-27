import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import { NotFoundError } from '../errors/not-found.error';
import { CategoryRepository, ICreateCategoryParams, IUpdateCategoryParams } from '../repository/category.repository';
import { ProductRepository } from '../repository/product.repository';

class CategoryService {
  constructor(
    private readonly _categoryRepository: CategoryRepository,
    private readonly _productRepository: ProductRepository
  ) {}

  async getAllCategories() {
    const categories = await this._categoryRepository.getAllCategories();
    
    if (!categories) {
      throw new InternalServerError('Failed to fetch categories');
    }

    return categories;
  }

  async getCategoryById(id: string) {
    const category = await this._categoryRepository.getCategoryById(id);
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  async createCategory(params: ICreateCategoryParams) {
    const existingCategory = await this._categoryRepository.getCategoryByCategoryId(params.categoryId);
    
    if (existingCategory) {
      throw new BadRequestError('Category with this ID already exists');
    }

    const category = await this._categoryRepository.createCategory(params);
    
    if (!category) {
      throw new InternalServerError('Failed to create category');
    }

    return category;
  }

  async updateCategory(categoryId: string, params: IUpdateCategoryParams) {
    const category = await this._categoryRepository.getCategoryById(categoryId);
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const updatedCategory = await this._categoryRepository.updateCategoryById(categoryId, params);
    
    if (!updatedCategory) {
      throw new InternalServerError('Failed to update category');
    }

    return updatedCategory;
  }

  async deleteCategory(categoryId: string) {
    const category = await this._categoryRepository.getCategoryById(categoryId);
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Use soft delete to preserve data integrity
    const deletedCategory = await this._categoryRepository.softDeleteCategoryById(categoryId);
    
    if (!deletedCategory) {
      throw new InternalServerError('Failed to delete category');
    }

    return { message: 'Category deleted successfully', deletedCategory };
  }

  async hardDeleteCategory(categoryId: string) {
    const category = await this._categoryRepository.getCategoryById(categoryId);
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const deleteResponse = await this._categoryRepository.deleteCategoryById(categoryId);
    
    if (!deleteResponse || deleteResponse.deletedCount === 0) {
      throw new InternalServerError('Failed to delete category');
    }

    return { message: 'Category permanently deleted', deleteResponse };
  }

  async mapProductsToCategories() {
    const categories = await this._categoryRepository.getAllCategories();
    const products = await this._productRepository.getAllProducts();

    if (!categories || !products) {
      throw new InternalServerError('Failed to fetch data');
    }

    const updatePromises = categories.map(async (category) => {
      // Find products that belong to this category
      const productsInCategory = products.filter((product) =>
        product.categoryIds.includes(category.categoryId)
      );

      // Extract product IDs
      const productIds = productsInCategory.map((product) => product.productId);

      // Update category with product IDs
      if (productIds.length > 0) {
        return await this._categoryRepository.updateCategoryByCategoryId(
          category.categoryId,
          { productIds }
        );
      }

      return category;
    });

    const updatedCategories = await Promise.all(updatePromises);

    return {
      message: 'Categories mapped successfully',
      categories: updatedCategories.filter(Boolean),
    };
  }

  async addProductToCategory(categoryId: string, productId: string) {
    const category = await this._categoryRepository.getCategoryByCategoryId(categoryId);
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const product = await this._productRepository.getProductByProductId(productId);
    
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updatedCategory = await this._categoryRepository.addProductToCategory(categoryId, productId);
    
    if (!updatedCategory) {
      throw new InternalServerError('Failed to add product to category');
    }

    return updatedCategory;
  }

  async removeProductFromCategory(categoryId: string, productId: string) {
    const category = await this._categoryRepository.getCategoryByCategoryId(categoryId);
    
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const updatedCategory = await this._categoryRepository.removeProductFromCategory(
      categoryId,
      productId
    );
    
    if (!updatedCategory) {
      throw new InternalServerError('Failed to remove product from category');
    }

    return updatedCategory;
  }
}

export default new CategoryService(
  new CategoryRepository(),
  new ProductRepository()
);