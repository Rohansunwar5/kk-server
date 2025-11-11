import { NextFunction, Request, Response } from 'express';
import categoryService from '../services/category.service';
import { BadRequestError } from '../errors/bad-request.error';

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  const response = await categoryService.getAllCategories();
  next(response);
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const response = await categoryService.getCategoryById(id);
  next(response);
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId, name, subCategoryIds, imageUrl, description, isActive } = req.body;
  const response = await categoryService.createCategory({
    categoryId,
    name,
    subCategoryIds,
    imageUrl,
    description,
    isActive
  });
  next(response);
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId } = req.params;
  const { name, subCategoryIds, imageUrl, description, isActive } = req.body;

  if (!categoryId) {
    throw new BadRequestError('Category ID is required');
  }

  const response = await categoryService.updateCategory(categoryId, {
    name,
    subCategoryIds,
    imageUrl,
    description,
    isActive
  });

  next(response);
};



export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new BadRequestError('Category ID is required');
  }

  const response = await categoryService.deleteCategory(categoryId);
  next(response);
};

export const hardDeleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new BadRequestError('Category ID is required');
  }

  const response = await categoryService.hardDeleteCategory(categoryId);
  next(response);
};

// export const mapProductsToCategories = async (req: Request, res: Response, next: NextFunction) => {
//   const response = await categoryService.mapProductsToCategories();

//   next(response);
// };

export const addProductToCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId } = req.params;
  const { productId } = req.body;

  const response = await categoryService.addProductToCategory(categoryId, productId);
  next(response);
};

export const removeProductFromCategory = async (req: Request,res: Response,next: NextFunction) => {
  const { categoryId, productId } = req.params;
  const response = await categoryService.removeProductFromCategory(categoryId, productId);

  next(response);
};

export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId } = req.params;
  const response = await categoryService.getProductsByCategory(categoryId);

  next(response);
};
