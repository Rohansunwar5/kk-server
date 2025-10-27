import { NextFunction, Request, Response } from 'express';
import subCategoryService from '../services/subcategory.service';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { BadRequestError } from '../errors/bad-request.error';

export const getAllSubCategories = async (req: Request, res: Response, next: NextFunction) => {
  const response = await subCategoryService.getAllSubCategories();
  next(response);
};

export const getSubCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.getSubCategoryById(id);
  next(response);
};

export const getSubCategoriesByParentCategoryId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { parentCategoryId } = req.params;

  if (!parentCategoryId) {
    throw new BadRequestError('Parent category ID is required');
  }

  const response = await subCategoryService.getSubCategoriesByParentCategoryId(parentCategoryId);
  next(response);
};

export const createSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const {
    subCategoryId,
    name,
    parentCategoryId,
    productIds,
    bannerIds,
    description,
    isActive,
  } = req.body;

  if (!subCategoryId || !name || !parentCategoryId) {
    throw new BadRequestError('SubCategory ID, name, and parent category ID are required');
  }

  const response = await subCategoryService.createSubCategory({
    subCategoryId,
    name,
    parentCategoryId,
    productIds,
    bannerIds,
    description,
    isActive,
  });

  next(response);
};

export const updateSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { subCategoryId } = req.params;
  const { name, parentCategoryId, productIds, bannerIds, description, isActive } = req.body;

  if (!subCategoryId) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.updateSubCategory(subCategoryId, {
    name,
    parentCategoryId,
    productIds,
    bannerIds,
    description,
    isActive,
  });

  next(response);
};

export const deleteSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { subCategoryId } = req.params;

  if (!subCategoryId) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.deleteSubCategory(subCategoryId);
  next(response);
};

export const hardDeleteSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { subCategoryId } = req.params;

  if (!subCategoryId) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.hardDeleteSubCategory(subCategoryId);
  next(response);
};

export const addProductToSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { subCategoryId } = req.params;
  const { productId } = req.body;

  if (!subCategoryId || !productId) {
    throw new BadRequestError('SubCategory ID and Product ID are required');
  }

  const response = await subCategoryService.addProductToSubCategory(subCategoryId, productId);
  next(response);
};

export const removeProductFromSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { subCategoryId, productId } = req.params;

  if (!subCategoryId || !productId) {
    throw new BadRequestError('SubCategory ID and Product ID are required');
  }

  const response = await subCategoryService.removeProductFromSubCategory(subCategoryId, productId);
  next(response);
};

export const mapProductsToSubCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const response = await subCategoryService.mapProductsToSubCategories();

  next(response);
};